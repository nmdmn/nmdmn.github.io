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
        this.isCollide = false;
    }

    //set new postition for draw
    update(delta_time) {
        const distorted_vel = vector.mul(this.velocity, delta_time);
        this.position = vector.add(this.position, distorted_vel);

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

    //calculate new velocities if ballz colliding + static resolution
    //XXX BUGGY AF
    collide(particles) {
        this.isCollide = false;
        particles.forEach((other) => {
            let direction_from_other = vector.sub(this.position, other.position);
            let distance = vector.length(direction_from_other);
            let sum_radius = this.size + other.size + 1;
            let overlap = sum_radius - distance;
            if (distance != 0 && overlap > 0) {
                this.isCollide = true;

                let correct_unit_dir = vector.norm(direction_from_other);
                this.position = vector.add(this.position, vector.mul(correct_unit_dir, overlap / 2));
                other.position = vector.add(other.position, vector.mul(vector.flip(correct_unit_dir), overlap / 2));

                let mass_coeff = 2 * other.mass / (this.mass + other.mass);
                let velocity_diff = vector.sub(this.velocity, other.velocity);
                let position_diff = vector.sub(this.position, other.position);
                let dot_prod = vector.dot(velocity_diff, position_diff);
                let coeff = dot_prod / (distance * distance) * mass_coeff;
                let unit_dir = vector.norm(position_diff);
                let new_velocity = vector.sub(this.velocity, vector.mul(unit_dir, coeff));

                mass_coeff = 2 * this.mass / (this.mass + other.mass);
                velocity_diff = vector.sub(other.velocity, this.velocity);
                position_diff = vector.sub(other.position, this.position);
                dot_prod = vector.dot(velocity_diff, position_diff);
                coeff = dot_prod / (distance * distance) * mass_coeff;
                unit_dir = vector.norm(position_diff);
                let new_velocity2 = vector.sub(other.velocity, vector.mul(unit_dir, coeff));

                this.velocity = new_velocity;
                other.velocity = new_velocity2;
            }
        });
    }

    //draw a circle around 'this.position'
    draw(context) {
        context.beginPath();

        context.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
        if (this.isCollide) {
            context.fillStyle = `rgb(${255}, ${0}, ${0})`;
        }

        context.strokeStyle = $("body").css("--color-light-white");
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
            const position = {
                x: random.range(size, bound.width - size),
                y: random.range(size, bound.height - size)
            };
            const speed = random.range(1, 42);
            let velocity = {
                x: random.range(-1, 1),
                y: random.range(-1, 1)
            };
            velocity = vector.norm(velocity);
            velocity = vector.mul(velocity, 89 / size * speed);

            particles.push(new particle(position, velocity, size));
        }

        return particles;
    }
}
