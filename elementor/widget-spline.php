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
                $frame['y'] = isset($f['y']['size']) ? floatval($f['y']['size']) : (isset($f['y']) ? floatval($f['y']) : 0);
                $frame['rotation'] = isset($f['rotation']['size']) ? floatval($f['rotation']['size']) : (isset($f['rotation']) ? floatval($f['rotation']) : 0);

                $clean[] = $frame;
            }
        }

        $timeline = wp_json_encode($clean);
?>
<div class="wp-spline-container"
     data-timeline='<?php echo esc_attr($timeline); ?>'>

    <iframe class="wp-spline-frame"
        src="<?php echo esc_url($settings['spline_url']); ?>"
        width="100%"
        height="600"
        frameborder="0"></iframe>

    <div class="wp-scroll-indicator">Scroll: 0%</div>

</div>
<?php
    }
}
