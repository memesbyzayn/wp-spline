<?php
if (!defined('ABSPATH')) exit;

class ZA_Spline_Elementor_Widget extends \Elementor\Widget_Base {

    public function get_name() { return 'wp_spline_animator'; }
    public function get_title() { return 'Spline Animator'; }
    public function get_icon() { return 'eicon-animation'; }
    public function get_categories() { return ['general']; }

    protected function register_controls() {

        $this->start_controls_section('content', [
            'label' => 'Spline Settings',
        ]);

        $this->add_control('spline_url', [
            'label' => 'Spline Embed URL',
            'type' => \Elementor\Controls_Manager::TEXT,
        ]);

        $this->add_control('spline_source', [
            'label' => 'Source Type',
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => [
                'url' => 'Embed URL',
                'upload' => 'Upload (self-hosted)'
            ],
            'default' => 'url'
        ]);

        $this->add_control('spline_file', [
            'label' => 'Upload Spline File',
            'type' => \Elementor\Controls_Manager::MEDIA,
            'description' => 'Upload an HTML export or hosted file to use for the iframe (falls back to Embed URL).',
        ]);

        $repeater = new \Elementor\Repeater();

        $repeater->add_control('scroll_pos', [
            'label' => 'Scroll Position',
            'type' => \Elementor\Controls_Manager::NUMBER,
            'default' => 0,
        ]);

        $repeater->add_control('scale', [
    'label' => 'Scale',
    'type' => \Elementor\Controls_Manager::SLIDER,
    'range' => [
        'px' => [
            'min' => 0.1,
            'max' => 5,
            'step' => 0.1,
        ],
    ],
    'default' => [
        'size' => 1,
    ],
]);


      $repeater->add_control('x', [
    'label' => 'X Position',
    'type' => \Elementor\Controls_Manager::SLIDER,
    'range' => [
        'px' => [
            'min' => -2000,
            'max' => 2000,
        ],
    ],
]);

      $repeater->add_control('x_unit', [
    'label' => 'X Unit',
    'type' => \Elementor\Controls_Manager::SELECT,
    'options' => [
        'px' => 'px',
        'vw' => 'vw',
        'vh' => 'vh',
        '%' => '%'
    ],
    'default' => 'px',
]);


      $repeater->add_control('y', [
    'label' => 'Y Position',
    'type' => \Elementor\Controls_Manager::SLIDER,
    'range' => [
        'px' => [
            'min' => -2000,
            'max' => 2000,
        ],
    ],
]);

$repeater->add_control('y_unit', [
    'label' => 'Y Unit',
    'type' => \Elementor\Controls_Manager::SELECT,
    'options' => [
        'px' => 'px',
        'vw' => 'vw',
        'vh' => 'vh',
        '%' => '%'
    ],
    'default' => 'px',
]);

$repeater->add_control('rotation', [
    'label' => 'Rotation',
    'type' => \Elementor\Controls_Manager::SLIDER,
    'range' => [
        'deg' => [
            'min' => -360,
            'max' => 360,
        ],
    ],
]);

$repeater->add_control('rotation_axis', [
    'label' => 'Rotation Axis',
    'type' => \Elementor\Controls_Manager::SELECT,
    'options' => [
        'Y' => 'rotateY',
        'Z' => 'rotateZ',
        'X' => 'rotateX'
    ],
    'default' => 'Y',
]);

$repeater->add_control('z_index', [
    'label' => 'Z Index',
    'type' => \Elementor\Controls_Manager::NUMBER,
    'default' => 0,
]);

        $this->add_control('timeline', [
            'label' => 'Timeline Frames',
            'type' => \Elementor\Controls_Manager::REPEATER,
            'fields' => $repeater->get_controls(),
            'default' => [],
            'title_field' => '{{{ scroll_pos }}}',
        ]);

        $this->end_controls_section();
    }

    protected function render() {

        $settings = $this->get_settings_for_display();

        wp_enqueue_script('wp-spline-timeline');
        wp_enqueue_style('wp-spline-style');

        // Sanitize timeline frames: normalize slider objects and numeric values
        $raw_timeline = $settings['timeline'] ?? [];
        $clean = [];
        if (is_array($raw_timeline)) {
            foreach ($raw_timeline as $f) {
                $frame = [];
                $frame['scroll_pos'] = isset($f['scroll_pos']) ? floatval($f['scroll_pos']) : 0;

                // Slider controls in Elementor return arrays like ['size' => x]
                $frame['scale'] = isset($f['scale']['size']) ? floatval($f['scale']['size']) : (isset($f['scale']) ? floatval($f['scale']) : 1);

                $frame['x'] = isset($f['x']['size']) ? floatval($f['x']['size']) : (isset($f['x']) ? floatval($f['x']) : 0);
                $frame['x_unit'] = isset($f['x_unit']) ? sanitize_text_field($f['x_unit']) : 'px';

                $frame['y'] = isset($f['y']['size']) ? floatval($f['y']['size']) : (isset($f['y']) ? floatval($f['y']) : 0);
                $frame['y_unit'] = isset($f['y_unit']) ? sanitize_text_field($f['y_unit']) : 'px';

                $frame['rotation'] = isset($f['rotation']['size']) ? floatval($f['rotation']['size']) : (isset($f['rotation']) ? floatval($f['rotation']) : 0);
                $frame['rotation_axis'] = isset($f['rotation_axis']) ? sanitize_text_field($f['rotation_axis']) : 'Y';

                $frame['z_index'] = isset($f['z_index']) ? intval($f['z_index']) : 0;

                $clean[] = $frame;
            }
        }

        $timeline = wp_json_encode($clean);

        // Determine iframe src: prefer uploaded file when selected
        $iframe_src = '';
        $source = $settings['spline_source'] ?? 'url';
        if ($source === 'upload' && !empty($settings['spline_file'])) {
            $media = $settings['spline_file'];
            if (is_array($media) && !empty($media['url'])) {
                $iframe_src = esc_url_raw($media['url']);
            } else {
                // sometimes Elementor stores media as ID or string
                $iframe_src = esc_url_raw($media);
            }
        }

        if (empty($iframe_src) && !empty($settings['spline_url'])) {
            $iframe_src = esc_url_raw($settings['spline_url']);
        }
?>
<div class="wp-spline-container"
     data-timeline='<?php echo esc_attr($timeline); ?>'
     data-src='<?php echo esc_attr($iframe_src); ?>'>

    <iframe class="wp-spline-frame"
        src="about:blank"
        width="100%"
        height="600"
        frameborder="0"
        loading="lazy"></iframe>

    <noscript>
        <iframe class="wp-spline-frame" src="<?php echo esc_url($iframe_src); ?>" width="100%" height="600" frameborder="0"></iframe>
    </noscript>

    <div class="wp-scroll-indicator">Scroll: 0%</div>

</div>
<?php
    }
}
