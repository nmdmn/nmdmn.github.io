//represent an entity in the system,
//encapsulate position, velocity and mass
class particle {
    constructor(position, velocity, size) {
        this.position = position;
        this.velocity = velocity;
        this.size = size;
        this.color = {
            r: random.range(0, 255),
            g: random.range(0, 255),
            b: random.range(0, 255)
        };
        this.mass = this.size * this.size;
    }

    //set new postition for draw
    update(delta_time) {
        //const distorted_vel = vector.mul(this.velocity, delta_time);
        //this.position.add(distorted_vel);

    }

    //flip velocity at the edges of the screen
    check_edges(width, height) {
        if (this.position.x < this.size) {
            this.position.x = this.size;
            this.velocity.x *= -1;
        } else if (this.position.x > width - this.size) {
            this.position.x = width - this.size;
            this.velocity.x *= -1;
        }

        if (this.position.y < this.size) {
            this.position.y = this.size;
            this.velocity.y *= -1;
        } else if (this.position.y > height - this.size) {
            this.position.y = height - this.size;
            this.velocity.y *= -1;
        }
    }

    collide(particles) {
        particles.forEach((other) => {
            const direction = vector.sub(this.position, other.position);
            const distance = direction.length();
            const sum_radius = this.size + other.size;
            const overlap = sum_radius - distance;
            if (distance != 0 && overlap > 0) {
                direction.norm();
                this.position.add(vector.mul(direction, overlap / 2));
                direction.flip();
                other.position.add(vector.mul(direction, overlap / 2));
            }
        });
    }

    //draw a circle around 'this.position'
    draw(context) {
        context.beginPath();

        context.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
        context.strokeStyle = $("body").css("--color-light_white");
        context.lineWidth = 1.5;

        context.arc(this.position.x, this.position.y, this.size, 0, 2 * Math.PI);
        context.fill();
        context.stroke();

    }

    //generate given number of particles and return the list of them
    static spawn(num_particle, bound) {
        const particles = [];
        for (let i = 0; i < num_particle; i++) {
            const size = random.range(9, 89);
            const position = new vector(
                random.range(size, bound.width - size),
                random.range(size, bound.height - size)
            );
            const speed = random.range(1, 42);
            const velocity = new vector(
                random.range(-1, 1),
                random.range(-1, 1)
            );
            velocity.norm();
            velocity.mul(89 / size * speed);

            particles.push(new particle(position, velocity, size));
        }

        return particles;
    }
}
