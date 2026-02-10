<?php
/*
Plugin Name: Wp Spline Animator for Elementor
Plugin URI: https://github.com/memesbyzayn
Description: Adds scroll-based 3D Spline animations inside Elementor with flexible timeline control.
Version: 1.0.0
Author: Zain Ali
Author URI: https://github.com/memesbyzayn
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: wp-spline-animator
*/

if (!defined('ABSPATH')) exit;

add_action('elementor/widgets/register', function($widgets_manager) {
    require_once __DIR__ . '/elementor/widget-spline.php';
    $widgets_manager->register(new \ZA_Spline_Elementor_Widget());
});

add_action('wp_enqueue_scripts', function () {
    wp_register_script(
        'wp-spline-timeline',
        plugins_url('/assets/timeline.js', __FILE__),
        [],
        '1.0.0',
        true
    );

    wp_register_style(
        'wp-spline-style',
        plugins_url('/assets/style.css', __FILE__),
        [],
        '1.0.0'
    );
});
