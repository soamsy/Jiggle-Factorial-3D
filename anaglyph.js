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
      0.7762762904167175, -0.0017037560464814305, -0.000020098639652132988, 0.16620422899723053, 0.0006450785440392792, -0.0008379360078833997, 0.15850535035133362, -0.000686841260176152, 0.0002758795744739473,
    ]);

    this.colorMatrixRight = new THREE.Matrix3().fromArray([
      -0.006647571921348572, 0.06735259294509888, 0.09600840508937836, -0.09514870494604111, 0.941753089427948, -0.06426528096199036, 0.0008104303269647062, -0.007360187824815512, 0.9688390493392944,
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
        '	color = pow(color, vec3(1.0 / 2.2));',

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