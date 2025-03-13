// I copied this entire class because I need to replace colorMatrixLeft and colorMatrixRight
// with matrices that actually preserve color for 3D glasses. I do not know why three js
// has such a bad default.
//
// I generated the matrix values with https://tschw.github.io/angler.js/app/frames/main.html
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
export class AnaglyphEffect {
  constructor(renderer, disparity, width = 512, height = 512) {

    this.colorMatrixLeft = new THREE.Matrix3().fromArray([
      1.0671679973602295,-0.0016435992438346148,0.0001777536963345483,-0.028107794001698494,-0.00019593400065787137,-0.0002875397040043026,-0.04279090091586113,0.000015809757314855233,-0.00024287120322696865
    ]);
    
    this.colorMatrixRight = new THREE.Matrix3().fromArray([
      -0.0355340838432312,-0.06440307199954987,0.018319187685847282,-0.10269022732973099,0.8079727292060852,-0.04835830628871918,0.0001224992738571018,-0.009558862075209618,0.567823588848114
    ]);

    this._stereo = new THREE.StereoCamera();
    this._stereo.eyeSep = disparity;

    const _params = { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat };

    const _renderTargetL = new THREE.WebGLRenderTarget(width, height, _params);
    const _renderTargetR = new THREE.WebGLRenderTarget(width, height, _params);

    const _material = new THREE.ShaderMaterial({

      uniforms: {

        'mapLeft': { value: _renderTargetL.texture },
        'mapRight': { value: _renderTargetR.texture },

        'colorMatrixLeft': { value: this.colorMatrixLeft },
        'colorMatrixRight': { value: this.colorMatrixRight }

      },

      vertexShader: [

        'varying vec2 vUv;',

        'void main() {',

        '	vUv = vec2( uv.x, uv.y );',
        '	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

        '}'

      ].join('\n'),

      fragmentShader: [

        'uniform sampler2D mapLeft;',
        'uniform sampler2D mapRight;',
        'varying vec2 vUv;',

        'uniform mat3 colorMatrixLeft;',
        'uniform mat3 colorMatrixRight;',

        'void main() {',

        '	vec2 uv = vUv;',

        '	vec4 colorL = texture2D( mapLeft, uv );',
        '	vec4 colorR = texture2D( mapRight, uv );',

        '	vec3 color = clamp(',
        '			colorMatrixLeft * colorL.rgb +',
        '			colorMatrixRight * colorR.rgb, 0., 1. );',

        '	gl_FragColor = vec4(',
        '			color.r, color.g, color.b,',
        '			max( colorL.a, colorR.a ) );',

        '	#include <tonemapping_fragment>',
        '	#include <colorspace_fragment>',

        '}'

      ].join('\n')

    });

    const _quad = new FullScreenQuad(_material);

    this.setSize = function (width, height) {

      renderer.setSize(width, height);

      const pixelRatio = renderer.getPixelRatio();

      _renderTargetL.setSize(width * pixelRatio, height * pixelRatio);
      _renderTargetR.setSize(width * pixelRatio, height * pixelRatio);

    };

    this.render = function (scene, camera) {

      const currentRenderTarget = renderer.getRenderTarget();

      if (scene.matrixWorldAutoUpdate === true) scene.updateMatrixWorld();

      if (camera.parent === null && camera.matrixWorldAutoUpdate === true) camera.updateMatrixWorld();

      this._stereo.update(camera);

      renderer.setRenderTarget(_renderTargetL);
      renderer.clear();
      renderer.render(scene, this._stereo.cameraL);

      renderer.setRenderTarget(_renderTargetR);
      renderer.clear();
      renderer.render(scene, this._stereo.cameraR);

      renderer.setRenderTarget(null);
      _quad.render(renderer);

      renderer.setRenderTarget(currentRenderTarget);

    };

    this.dispose = function () {

      _renderTargetL.dispose();
      _renderTargetR.dispose();

      _material.dispose();
      _quad.dispose();

    };
  }
}
