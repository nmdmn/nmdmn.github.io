$(document).ready(() => {
    console.log("0xDEAF.:|!-__/ TRALALA");

    //acquire context, we need that for drawing stuff on the screen
    const canvas = $("#canvas")[0];
    const context = canvas.getContext("2d");

    //initialize the canvas dimensions the largest possible
    let bound = refresh_canvas_size(window.innerWidth, window.innerHeight);

    //create random particles (random pos constrained by the canvas dimensions called 'bound')
    const particles = particle.spawn(53, bound);

    //save time for later calculating dT
    let last = Date.now();

    //ask for a re-draw
    window.requestAnimationFrame(tick);

    //------------------------------

    //this will be executed on every draw
    function tick() {
        //refresh canvas to window inner dimensions
        bound = refresh_canvas_size(window.innerWidth, window.innerHeight);

        //clear canvas
        context.clearRect(0, 0, bound.width, bound.height);

        //calculate delta time
        const to_seconds = 1 / 1000;
        const now = Date.now();
        const delta = now - last;
        last = now;

        //update and draw all particles
        particles.forEach((particle) => {
            particle.update(delta * to_seconds);
            particle.check_edges(bound.width, bound.height);
            particle.collide(particles);
            particle.draw(context);
        });

        //so this function ask for a re-draw with itself...
        //RECURSION MADAFAKA!
        window.requestAnimationFrame(tick);
    }

    //set canvas dimensions to given value and return a struct instant of the values
    function refresh_canvas_size(width, height) {
        canvas.width = width;
        canvas.height = height;
        return {
            width: canvas.width,
            height: canvas.height
        };
    }
});
