import { Script, field } from '@n3rdw1z4rd/engine';
import { Color, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';

/** Rotates its object around the Y axis. Attach children to a spinning pivot to make them orbit. */
export class Spin extends Script {
    @field({ min: -3, max: 3, step: 0.05, label: 'speed (rad/s)' }) speed = 0.4;
    @field() tilt = false;

    update(dt: number) {
        this.object.rotation.y += this.speed * dt;
        if (this.tilt) this.object.rotation.x += this.speed * 0.5 * dt;
    }
}

/** Floats its object up and down and tints its material. */
export class Bob extends Script {
    @field({ min: 0, max: 2, step: 0.05 }) amplitude = 0.35;
    @field({ min: 0.1, max: 4, step: 0.1, label: 'frequency (Hz)' }) frequency = 0.6;
    @field({ type: 'color' }) tint = '#3fd1a4';

    private _baseY = 0;
    private _t = 0;

    start() {
        this._baseY = this.object.position.y;
        this._t = 0;
    }

    update(dt: number) {
        this._t += dt;
        this.object.position.y = this._baseY + Math.sin(this._t * this.frequency * Math.PI * 2) * this.amplitude;
        const material = (this.object as Mesh).material as MeshStandardMaterial | undefined;
        material?.color?.set(this.tint);
    }
}

/** Keeps its object (usually a camera) looking at a target. Shows an object-reference field. */
export class LookAt extends Script {
    @field({ type: Object3D }) target: Object3D | null = null;

    private readonly _p = new Vector3();

    lateUpdate() {
        if (this.target) this.object.lookAt(this.target.getWorldPosition(this._p));
    }
}

/** Data component (no behavior): read by systems or other scripts. Shown in the inspector too. */
export class Tag {
    constructor(public label = '', public color = new Color('#ffffff')) {}
}
