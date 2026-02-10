function lerp(a, b, t) {
    return a + (b - a) * t;
}

function getFrame(frames, scroll) {

    frames.sort((a, b) =>
        parseFloat(a.scroll_pos) - parseFloat(b.scroll_pos)
    );

    for (let i = 0; i < frames.length - 1; i++) {

        let f1 = frames[i];
        let f2 = frames[i + 1];

        if (scroll >= f1.scroll_pos && scroll <= f2.scroll_pos) {

            let t =
                (scroll - f1.scroll_pos) /
                (f2.scroll_pos - f1.scroll_pos);

            return {
                scale: lerp(f1.scale, f2.scale, t),
                x: lerp(f1.x, f2.x, t),
                y: lerp(f1.y, f2.y, t),
                rotation: lerp(f1.rotation, f2.rotation, t)
            };
        }
    }

    return frames[frames.length - 1];
}

document.querySelectorAll('.akdev-spline-container')
.forEach(container => {

    let frames = JSON.parse(container.dataset.timeline || "[]");
    const iframe = container.querySelector('iframe');
    const indicator = container.querySelector('.akdev-scroll-indicator');

    window.addEventListener('scroll', () => {

        let scrollY = window.scrollY;
        let docHeight =
            document.body.scrollHeight - window.innerHeight;

        let percent = docHeight > 0
            ? Math.round((scrollY / docHeight) * 100)
            : 0;

        indicator.textContent = "Scroll: " + percent + "%";

        if (!frames.length) return;

        const state = getFrame(frames, scrollY);

        iframe.style.transform =
            "scale(" + state.scale + ")" +
            " translate(" + state.x + "px," + state.y + "px)" +
            " rotateY(" + state.rotation + "deg)";

    });
});
