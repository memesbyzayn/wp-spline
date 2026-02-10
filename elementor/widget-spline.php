<?php
if (!defined('ABSPATH')) exit;

class AKDEV_Spline_Elementor_Widget extends \Elementor\Widget_Base {

    public function get_name() {
        return 'akdev_spline_timeline';
    }

    public function get_title() {
        return 'AKDev Spline Timeline';
    }

    public function get_icon() {
        return 'eicon-animation';
    }

    public function get_categories() {
        return ['general'];
    }

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
            'type' => \Elementor\Controls_Manager::NUMBER,
            'default' => 1,
        ]);

        $repeater->add_control('x', [
            'label' => 'X Position',
            'type' => \Elementor\Controls_Manager::NUMBER,
            'default' => 0,
        ]);

        $repeater->add_control('y', [
            'label' => 'Y Position',
            'type' => \Elementor\Controls_Manager::NUMBER,
            'default' => 0,
        ]);

        $repeater->add_control('rotation', [
            'label' => 'Rotation Y',
            'type' => \Elementor\Controls_Manager::NUMBER,
            'default' => 0,
        ]);

        $this->add_control('timeline', [
            'label' => 'Scroll Timeline',
            'type' => \Elementor\Controls_Manager::REPEATER,
            'fields' => $repeater->get_controls(),
            'title_field' => 'Scroll {{scroll_pos}}',
        ]);

        $this->end_controls_section();
    }

    protected function render() {

        $settings = $this->get_settings_for_display();

        wp_enqueue_script('akdev-spline-timeline');
        wp_enqueue_style('akdev-spline-style');

        $timeline = json_encode($settings['timeline'] ?? []);
?>
        <div class="akdev-spline-container"
             data-timeline='<?php echo $timeline; ?>'>

            <iframe class="akdev-spline-frame"
                src="<?php echo esc_url($settings['spline_url']); ?>"
                width="100%"
                height="600"
                frameborder="0">
            </iframe>

            <div class="akdev-scroll-indicator">Scroll: 0%</div>

        </div>
<?php
    }
}
