<?php
/*
Plugin Name: AKDev Spline Elementor Timeline
Description: Elementor widget enabling scroll timeline control for Spline scenes.
Version: 1.0
Author: AKDev
*/

if (!defined('ABSPATH')) exit;

add_action('elementor/widgets/register', function($widgets_manager) {
    require_once __DIR__ . '/elementor/widget-spline.php';
    $widgets_manager->register(new \AKDEV_Spline_Elementor_Widget());
});

add_action('wp_enqueue_scripts', function () {
    wp_register_script(
        'akdev-spline-timeline',
        plugins_url('/assets/timeline.js', __FILE__),
        [],
        '1.0',
        true
    );

    wp_register_style(
        'akdev-spline-style',
        plugins_url('/assets/style.css', __FILE__),
        [],
        '1.0'
    );
});
