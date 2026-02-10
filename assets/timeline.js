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

    // Allow re-initialization: destroy previous instance if exists
    if(container._splineInstance && typeof container._splineInstance.destroy === 'function'){
        container._splineInstance.destroy();
    }

    const rawFrames = JSON.parse(container.dataset.timeline || "[]");

    const docHeight = ()=>Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;

    // Parse frames to include pixel scroll positions (support percents)
    const parseFrames = ()=>{
        const dh = docHeight();
        return (Array.isArray(rawFrames) ? rawFrames : []).map(f=>{
            const spRaw = parseFloat(f.scroll_pos || 0) || 0;
            let spPx = spRaw;
            if(spRaw >= 0 && spRaw <= 1){
                // fraction (0..1)
                spPx = Math.round(spRaw * dh);
            } else if(spRaw > 1 && spRaw <= 100){
                // likely percent (0..100)
                spPx = Math.round((spRaw / 100) * dh);
            } else {
                // treat as pixel value
                spPx = Math.round(spRaw);
            }
            return Object.assign({}, f, { scroll_pos: spPx });
        });
    };

    let frames = parseFrames();

    let lastScroll = window.scrollY;
    let ticking = false;

    function applyState(state){
        if(!state) return;
        const x = isNaN(state.x) ? 0 : state.x;
        const y = isNaN(state.y) ? 0 : state.y;
        const scale = isNaN(state.scale) ? 1 : state.scale;
        const rotation = isNaN(state.rotation) ? 0 : state.rotation;

        iframe.style.transform =
            'translate(' + x + 'px, ' + y + 'px) '
            + 'scale(' + scale + ') '
            + 'rotateY(' + rotation + 'deg)';
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
        // Ensure numeric state
        const safeState = {
            scale: val(state.scale, 1),
            x: val(state.x, 0),
            y: val(state.y, 0),
            rotation: val(state.rotation, 0)
        };

        applyState(safeState);
    }

    function onScroll(){
        lastScroll = window.scrollY;
        if(!ticking){
            ticking = true;
            requestAnimationFrame(()=>{ update(); ticking = false; });
        }
    }

    let resizeTimeout = null;
    function onResize(){
        // Debounce resize and recompute frame pixel positions
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(()=>{
            frames = parseFrames();
            update();
        }, 100);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // expose destroy so re-init is safe
    container._splineInstance = {
        destroy(){
            window.removeEventListener('scroll', onScroll, { passive: true });
            window.removeEventListener('resize', onResize);
            clearTimeout(resizeTimeout);
            container._splineInstance = null;
        }
    };

    // Initial update
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
