//this is the ID of the canvas tag in the index.html
const DOM_ID = "canvas";

//helper class for working with random numbers
class random {
    //get random number between 'min' and 'max' (both included)
    static range(min, max) {
        return Math.random() * (max - min + 1) + min;
    }
}

//helper class for dealing with linear algebra
class vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    //addition
    add(other) {
        this.x += other.x;
        this.y += other.y;
    }

    //subtraction
    sub(other) {
        this.x -= other.x;
        this.y -= other.y;
    }

    //multiplication
    mul(skalar) {
        this.x *= skalar;
        this.y *= skalar;
    }

    //opposite direction
    flip() {
        let tmp = this.x
        this.x = -this.y;
        this.y = tmp;
    }

    //lenght, or magnitude as you like
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    //normalize the vector
    norm() {
        const length = this.length();
        this.mul(1 / length);
    }

    //copy myself
    copy() {
        return new vector(this.x, this.y);
    }

    //add 2 vector
    static add(lhs, rhs) {
        return new vector(lhs.x + rhs.x, lhs.y + rhs.y);
    }

    //subtract 2 vector
    static sub(lhs, rhs) {
        return new vector(lhs.x - rhs.x, lhs.y - rhs.y);
    }

    //multiply a vector with a skalar
    static mul(lhs, rhs) {
        return new vector(lhs.x * rhs, lhs.y * rhs);
    }

    static dot(lhs, rhs) {
        return lhs.x * rhs.x + lhs.y * rhs.y;
    }
}
