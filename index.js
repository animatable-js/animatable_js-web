import { Animation, Ticker, Curve } from "./node_modules/animatable-js/dist/index.esm.js";

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

class Net {
    constructor(duration) {
        this.x = new Animation(duration, null, randomRange(0, 1));
        this.y = new Animation(duration, null, randomRange(0, 1));
        this.fade = new Animation(1000, Curve.Ease);
        this.size = randomRange(2, 5);
        this.opacity = randomRange(0.5, 1);
    }

    start() {
        this.x.animateTo(randomRange(0, 1));
        this.y.animateTo(randomRange(0, 1));
        this.fade.animateTo(1);
        return this;
    }

    end(callback) {
        this.fade.animateTo(0);
        this.fade.addStatusListener(status => {
            if (status == "backwarded") callback(this);
        });
    }

    /** @param {Net} other  */
    distanceTo(other) {
        const x = this.x.value - other.x.value;
        const y = this.y.value - other.y.value;

        return Math.sqrt(x * x + y * y);
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
    */
    draw(ctx, others) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const x = this.x.value;
        const y = this.y.value;
        const fade = this.fade.value;

        ctx.beginPath();
        ctx.arc(width * x, height * y, this.size, 0, 2 * Math.PI);
        ctx.fillStyle = `rgb(0, 0, 0, ${fade * this.opacity})`;
        ctx.fill();

        for (const other of others) {
            const distance = other.distanceTo(this);
            const otherFade = other.fade.value;
            if (distance < 0.1) {
                ctx.beginPath();
                ctx.moveTo(other.x.value * width, other.y.value * height);
                ctx.lineTo(x * width, y * height);
                ctx.lineWidth = 1;

                // 투명도 계산 (0.1 이하일 때 1, 0.1 이상일 때 0으로 변함)
                const opacity = Math.max(0, 1 - (distance * 10));
                
                ctx.strokeStyle = `rgb(0, 0, 0, ${opacity * Math.min(fade, otherFade)})`;
                ctx.stroke();
            }
        }
    }
}

class NetController {
    /**  @param {HTMLCanvasElement} canvas */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");;

        const observer = new ResizeObserver(() => {
            const rect = canvas.getBoundingClientRect();
            const ppi = devicePixelRatio;

            canvas.width = `${rect.width * ppi}`;
            canvas.height = `${rect.height * ppi}`;
            // this.ctx.scale(ppi, ppi);
        });
        
        observer.observe(canvas);
    }

    /** @type {Net[]} */
    #nets = [];

    attach(net) {
        this.#nets.push(net.start());
    }
    
    detach(net) {
        this.#nets = this.#nets.filter(e => e != net);
    }

    start() {
        new Ticker(this.draw.bind(this));
    }

    end() {
        this.#nets.forEach(net => net.end(() => this.detach(net)));
    }

    draw() {
        const width = this.ctx.canvas.width;
        const height = this.ctx.canvas.height;

        this.ctx.clearRect(0, 0, width, height);
        this.#nets.forEach(net => net.draw(this.ctx, this.#nets.filter(e => e != net)));
    }
}

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("header-canvas");
const controller = new NetController(canvas);
attachNets(200);
controller.start();

function attachNets(count) {
    for (let i = 0; i < count; i++) {
        attachNet();
    }
}

function attachNet() {
    const duration = randomRange(5000, 10000);
    const net = new Net(duration);
    setTimeout(() => {
        net.end(() => {controller.detach(net); attachNet()});
    }, duration - 1000); // duration - fade duration

    controller.attach(net);
}