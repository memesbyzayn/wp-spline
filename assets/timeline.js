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
                    rotation: lerp(val(f1.rotation,0), val(f2.rotation,0), t),
                    rotation_axis: f1.rotation_axis || f2.rotation_axis || 'Y',
                    z_index: lerp(val(f1.z_index,0), val(f2.z_index,0), t)
            };
        }
    }

    return frames[frames.length-1];
}

function initSpline(container){

    const canvas = container.querySelector('canvas.wp-spline-canvas');
    const iframe = container.querySelector('iframe');
    const indicator = container.querySelector('.wp-scroll-indicator');

    if(!canvas && !iframe) return;

    // destroy previous instance if present
    if(container._splineInstance && typeof container._splineInstance.destroy === 'function'){
        container._splineInstance.destroy();
    }

    // raw frames from data attribute (already sanitized in PHP when possible)
    const raw = JSON.parse(container.dataset.timeline || "[]");

    // Lazy-load support: data-src on container
    const dataSrc = container.dataset.src || '';
    // detect spline runtime usage (prod.spline.design or .splinecode)
    const isSplineRuntime = (typeof dataSrc === 'string') && (dataSrc.indexOf('spline.design') !== -1 || dataSrc.indexOf('.splinecode') !== -1);
    let observer = null;

    function loadIframe(){
        if(dataSrc && iframe && iframe.getAttribute('src') !== dataSrc){
            iframe.setAttribute('src', dataSrc);
        }
        if(observer){
            observer.disconnect();
            observer = null;
        }
    }

    // Spline runtime loader: dynamically import the runtime and init scene on the canvas
    let splineApp = null;
    let splineObj = null;
    let splineLoaded = false;
    async function loadSpline(){
        if(!isSplineRuntime || !canvas || splineLoaded) return;
        try{
            console.log('[wp-spline] loading runtime from', dataSrc);
            const mod = await import('https://unpkg.com/@splinetool/runtime/build/runtime.js');
            const Application = mod.Application || (mod.default && (mod.default.Application || mod.default));
            if(!Application){
                throw new Error('Spline Application export not found');
            }
            splineApp = new Application(canvas);
            await splineApp.load(dataSrc);
            // default to object named "Object" if not present
            try{
                splineObj = splineApp.findObjectByName('Object') || splineApp.findObjectByName('object');
            }catch(e){
                splineObj = null;
            }
            splineLoaded = true;
            console.log('[wp-spline] runtime loaded', { splineObj });
        }catch(e){
            console.warn('Spline runtime failed to load, falling back to iframe', e);
            // fallback: set iframe src so scene still appears
            if(iframe && dataSrc){
                iframe.setAttribute('src', dataSrc);
            }
            splineLoaded = false;
        }
        if(observer){
            observer.disconnect();
            observer = null;
        }
    }

    // In Elementor editor preview, load immediately for live preview
    const isElementorPreview = !!(window.elementorFrontend);
    if(dataSrc && isElementorPreview){
        if(isSplineRuntime){
            loadSpline();
        } else {
            loadIframe();
        }
    } else if(dataSrc){
        // Observe container visibility and load when near viewport
        try{
            observer = new IntersectionObserver(entries=>{
                entries.forEach(entry=>{
                    if(entry.isIntersecting || entry.intersectionRatio > 0){
                        if(isSplineRuntime){
                            loadSpline();
                        } else {
                            loadIframe();
                        }
                    }
                });
            }, { root: null, rootMargin: '400px' });
            observer.observe(container);
        }catch(e){
            // Fallback: load immediately if IntersectionObserver not supported
            loadIframe();
        }
    }

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
            // convert units for x/y into pixel values now for interpolation
            function toPx(valRaw, unit, axis){
                const v = val(valRaw, 0);
                if(!unit || unit === 'px') return v;
                if(unit === 'vw') return (v/100) * window.innerWidth;
                if(unit === 'vh') return (v/100) * window.innerHeight;
                if(unit === '%'){
                    return axis === 'x' ? (v/100) * window.innerWidth : (v/100) * window.innerHeight;
                }
                return v;
            }

            const xUnit = (f && f.x_unit) ? f.x_unit : 'px';
            const yUnit = (f && f.y_unit) ? f.y_unit : 'px';

            return {
                scroll_pos: sp,
                scale: val(f.scale, 1),
                x: toPx(f.x, xUnit, 'x'),
                y: toPx(f.y, yUnit, 'y'),
                rotation: val(f.rotation, 0),
                rotation_axis: (f && f.rotation_axis) ? String(f.rotation_axis) : 'Y',
                z_index: (f && f.z_index !== undefined) ? parseInt(f.z_index, 10) : 0
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
        const axis = state.rotation_axis || 'Y';
        const zIdx = Number.isFinite(state.z_index) ? Math.round(state.z_index) : null;

        if(isSplineRuntime && splineLoaded && splineObj){
            // Map rotation degrees to radians for the spline object
            const rad = rotation * (Math.PI/180);
            const axisLower = String(axis || 'Y').toLowerCase();
            // apply position/scale/rotation to the 3D object
            try{
                if(typeof splineObj.position?.set === 'function'){
                    splineObj.position.set(x, y, splineObj.position.z || 0);
                } else {
                    splineObj.position.x = x;
                    splineObj.position.y = y;
                }
                if(typeof splineObj.scale?.set === 'function'){
                    splineObj.scale.set(scale, scale, scale);
                } else {
                    splineObj.scale.x = scale; splineObj.scale.y = scale; splineObj.scale.z = scale;
                }
                if(axisLower === 'x') splineObj.rotation.x = rad;
                if(axisLower === 'y') splineObj.rotation.y = rad;
                if(axisLower === 'z') splineObj.rotation.z = rad;
                if(zIdx !== null) splineObj.zIndex = zIdx;
            }catch(e){
                // silent fail
            }
            return;
        }

        // apply transform with chosen rotation axis for iframe fallback
        const rotateCSS = 'rotate' + axis + '(' + rotation + 'deg)';
        if(iframe) iframe.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0) scale(' + scale + ') ' + rotateCSS;
        if(zIdx !== null && iframe) iframe.style.zIndex = zIdx;
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
            if(splineApp && typeof splineApp.destroy === 'function'){
                try{ splineApp.destroy(); }catch(e){}
            }
            splineApp = null; splineObj = null; splineLoaded = false;
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
