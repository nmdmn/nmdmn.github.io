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
    //opposite direction
    static flip(v) {
        return {
            x: -v.y,
            y: v.x
        };
    }

    //lenght, or magnitude as you like
    static length(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }

    //normalize the vector
    static norm(v) {
        const length = vector.length(v);
        return vector.mul(v, 1 / length);
    }

    //add 2 vector
    static add(lhs, rhs) {
        return {
            x: lhs.x + rhs.x,
            y: lhs.y + rhs.y
        };
    }

    //subtract 2 vector
    static sub(lhs, rhs) {
        return {
            x: lhs.x - rhs.x,
            y: lhs.y - rhs.y
        };
    }

    //multiply a vector with a skalar
    static mul(v, sk) {
        return {
            x: v.x * sk,
            y: v.y * sk
        };
    }

    //dot product of lhs and rhs
    static dot(lhs, rhs) {
        return lhs.x * rhs.x + lhs.y * rhs.y;
    }
}
