function lerp(a, b, t){
    return a + (b - a) * t;
}

function val(v, def = 0){
    if(v === undefined || v === null) return def;
    if(typeof v === "object" && v.size !== undefined) return parseFloat(v.size);
    return parseFloat(v);
}

function getFrame(frames, scroll){

    frames.sort((a,b)=>
        parseFloat(a.scroll_pos) - parseFloat(b.scroll_pos)
    );

    for(let i=0;i<frames.length-1;i++){

        let f1 = frames[i];
        let f2 = frames[i+1];

        if(scroll >= f1.scroll_pos && scroll <= f2.scroll_pos){

            let t = (scroll - f1.scroll_pos) /
                    (f2.scroll_pos - f1.scroll_pos);

            return {
                scale: lerp(val(f1.scale,1), val(f2.scale,1), t),
                x: lerp(val(f1.x,0), val(f2.x,0), t),
                y: lerp(val(f1.y,0), val(f2.y,0), t),
                rotation: lerp(val(f1.rotation,0), val(f2.rotation,0), t)
            };
        }
    }

    return frames[frames.length-1];
}

function initSpline(container){

    const iframe = container.querySelector('iframe');
    const indicator = container.querySelector('.wp-scroll-indicator');

    if(!iframe) return;

    // destroy previous instance if present
    if(container._splineInstance && typeof container._splineInstance.destroy === 'function'){
        container._splineInstance.destroy();
    }

    // raw frames from data attribute (already sanitized in PHP when possible)
    const raw = JSON.parse(container.dataset.timeline || "[]");

    const docHeight = ()=>Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;

    // convert scroll_pos to pixel values based on document height
    const computeFrames = ()=>{
        const dh = docHeight();
        return (Array.isArray(raw) ? raw : []).map(f=>{
            const fp = (f && (f.scroll_pos !== undefined)) ? parseFloat(f.scroll_pos) : 0;
            let sp = fp;
            if(fp >= 0 && fp <= 1){
                sp = Math.round(fp * dh);
            } else if(fp > 1 && fp <= 100){
                sp = Math.round((fp / 100) * dh);
            } else {
                sp = Math.round(fp);
            }
            return {
                scroll_pos: sp,
                scale: val(f.scale, 1),
                x: val(f.x, 0),
                y: val(f.y, 0),
                rotation: val(f.rotation, 0)
            };
        });
    };

    let frames = computeFrames();

    let lastScroll = window.scrollY;
    let ticking = false;

    function applyState(state){
        if(!state) return;
        const x = isFinite(state.x) ? state.x : 0;
        const y = isFinite(state.y) ? state.y : 0;
        const scale = isFinite(state.scale) ? state.scale : 1;
        const rotation = isFinite(state.rotation) ? state.rotation : 0;

        iframe.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + scale + ') rotateY(' + rotation + 'deg)';
    }

    function update(){
        const scrollY = lastScroll;
        const dh = docHeight();
        const percent = dh > 0 ? Math.round((scrollY / dh) * 100) : 0;
        if(indicator) indicator.textContent = 'Scroll: ' + percent + '%';

        if(!frames.length){
            const scale = 1 + percent / 200;
            iframe.style.transform = 'scale(' + scale + ')';
            return;
        }

        const state = getFrame(frames, scrollY);
        applyState(state);
    }

    function onScroll(){
        lastScroll = window.scrollY;
        if(!ticking){
            ticking = true;
            requestAnimationFrame(()=>{ update(); ticking = false; });
        }
    }

    let resizeTimer = null;
    function onResize(){
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(()=>{
            frames = computeFrames();
            update();
        }, 120);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    container._splineInstance = {
        destroy(){
            window.removeEventListener('scroll', onScroll, { passive: true });
            window.removeEventListener('resize', onResize);
            clearTimeout(resizeTimer);
            container._splineInstance = null;
        }
    };

    // initial
    lastScroll = window.scrollY;
    update();
}

/* Init on page */
document
    .querySelectorAll('.wp-spline-container')
    .forEach(initSpline);


/* Elementor live preview */
if(window.elementorFrontend){
    elementorFrontend.hooks.addAction(
        "frontend/element_ready/wp_spline_animator.default",
        function($scope){
            const container =
                $scope[0].querySelector('.wp-spline-container');

            if(container){
                initSpline(container);
                window.dispatchEvent(new Event("scroll"));
            }
        }
    );
}
