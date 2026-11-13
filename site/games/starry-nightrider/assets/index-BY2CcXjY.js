import{$ as e,$t as t,A as n,Ar as r,At as i,B as a,Br as o,Bt as s,C as c,Dr as l,Dt as u,E as d,Er as f,Et as p,F as m,Fr as h,Ft as g,G as _,Gr as v,Gt as y,H as b,Hr as x,Ht as S,I as C,Ir as w,It as T,J as E,Jt as D,K as O,Kr as k,Kt as A,L as j,Lr as ee,Lt as M,M as N,Mr as te,Mt as ne,N as re,Nr as P,Nt as ie,Or as ae,P as oe,Pr as F,Pt as se,Q as I,R as ce,Rr as le,Rt as ue,Sr as de,St as fe,T as pe,Tn as me,Tt as he,U as ge,Ur as _e,Ut as ve,V as ye,Vr as be,Vt as xe,W as Se,Wr as L,Wt as Ce,X as we,Xt as Te,Y as Ee,Z as De,Zt as Oe,_ as ke,_n as Ae,_r as je,an as R,ar as Me,at as Ne,b as Pe,bn as Fe,br as z,bt as B,cn as Ie,ct as Le,dn as V,dt as Re,en as H,et as U,fn as ze,fr as Be,ft as Ve,g as He,gn as Ue,gt as We,h as Ge,hn as Ke,hr as qe,ht as Je,in as Ye,it as Xe,j as Ze,jr as W,jt as Qe,kr as $e,kt as et,ln as tt,lt as nt,m as rt,mn as it,mr as at,mt as ot,nn as st,nr as ct,nt as lt,on as ut,or as dt,ot as ft,pn as pt,pr as mt,pt as ht,q as gt,qr as _t,qt as vt,rn as yt,rr as bt,rt as xt,sn as St,sr as Ct,st as wt,tn as Tt,tr as Et,tt as Dt,un as Ot,ut as G,v as kt,vn as At,vr as jt,vt as Mt,w as Nt,wn as Pt,wr as Ft,wt as It,x as Lt,xr as Rt,xt as zt,yr as Bt,yt as Vt,zr as Ht,zt as Ut}from"./kit-DsD4Rc8o.js";import{i as Wt,o as Gt}from"./hails-DeolUH4Z.js";(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();function Kt(){let e=null,t=!1,n=null,r=null;function i(t,a){r=e.requestAnimationFrame(i),n(t,a)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function qt(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var K={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureLod( envMap, envMapRotation * retroVec, roughnessToMip( roughness ) );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_PMREM
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.045 );
material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef USE_DIFFUSE_ROUGHNESS
	float diffuseRoughnessFactor = diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		diffuseRoughnessFactor *= texture2D( diffuseRoughnessMap, vDiffuseRoughnessMapUv ).r;
	#endif
	material.diffuseRoughness = saturate( diffuseRoughnessFactor );
#endif
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.045 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float diffuseRoughness;
	#endif
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
#ifdef USE_DIFFUSE_ROUGHNESS
	const float EON_EPSILON = 1e-7;
	float FON_DirectionalAlbedo( const in float mu, const in float roughness, const in float A ) {
		float muComp = 1.0 - mu;
		float gOverPi = muComp * ( 0.0571085289 + muComp * ( 0.491881867 + muComp * ( - 0.332181442 + muComp * 0.0714429953 ) ) );
		return A * ( 1.0 + roughness * gOverPi );
	}
	vec3 BRDF_EON( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 diffuseColor, const in float roughness ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return BRDF_Lambert( rho );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float s = dot( lightDir, viewDir ) - dotNL * dotNV;
		float sOverT = ( s > 0.0 ) ? s / max( max( dotNL, dotNV ), EON_EPSILON ) : s;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		vec3 singleScatter = rho * RECIPROCAL_PI * A * ( 1.0 + roughness * sOverT );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		float albedoV = FON_DirectionalAlbedo( dotNV, roughness, A );
		float albedoL = FON_DirectionalAlbedo( dotNL, roughness, A );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		vec3 multiScatter = rhoMultiScatter * RECIPROCAL_PI
			* max( EON_EPSILON, 1.0 - albedoV )
			* max( EON_EPSILON, 1.0 - albedoL )
			/ max( EON_EPSILON, 1.0 - averageAlbedo );
		return singleScatter + multiScatter;
	}
	vec3 EON_DirectionalAlbedo( const in vec3 diffuseColor, const in float roughness, const in float dotNV ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return rho;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		float directionalAlbedo = FON_DirectionalAlbedo( dotNV, roughness, A );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		return rho * directionalAlbedo + rhoMultiScatter * ( 1.0 - directionalAlbedo );
	}
#endif
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = max( material.clearcoatRoughness, 0.045 );
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = max( material.roughness, 0.045 );
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float alphaT = max( material.alphaT, alpha );
		float V = V_GGX_SmithCorrelated_Anisotropic( alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		vec3 diffuseBRDF = BRDF_EON( directLight.direction, geometryViewDir, geometryNormal, material.diffuseColor, material.diffuseRoughness ) * ( 1.0 - material.metalness );
	#else
		vec3 diffuseBRDF = BRDF_Lambert( material.diffuseContribution );
	#endif
	reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuseAlbedo = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness );
		vec3 diffuse = irradiance * RECIPROCAL_PI * diffuseAlbedo * ( 1.0 - singleScattering - multiScattering );
	#else
		vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#endif
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuse = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness ) * ( 1.0 - totalScatteringDielectric );
	#else
		vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	#endif
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		int probeGrid = - 1;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( isInsideLightProbeGrid( probeWorldPos, probeWorldNormal, probesMin[ i ], probesMax[ i ], probesResolution[ i ] ) ) probeGrid = UNROLLED_LOOP_INDEX;
		}
		#pragma unroll_loop_end
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( probeGrid == UNROLLED_LOOP_INDEX ) irradiance += getLightProbeGridIrradiance( probesSH[ i ], probesMin[ i ], probesMax[ i ], probesResolution[ i ], probeWorldPos, probeWorldNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#if NUM_LIGHT_PROBE_GRIDS > 0
uniform highp sampler3D probesSH[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMin[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMax[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesResolution[ NUM_LIGHT_PROBE_GRIDS ];
bool isInsideLightProbeGrid( vec3 worldPos, vec3 worldNormal, vec3 probesMin, vec3 probesMax, vec3 probesResolution ) {
	vec3 spacing = ( probesMax - probesMin ) / probesResolution;
	vec3 samplePos = worldPos + worldNormal * spacing * 0.5;
	vec3 margin = spacing * 0.01;
	return all( greaterThanEqual( samplePos, probesMin - margin ) ) && all( lessThanEqual( samplePos, probesMax + margin ) );
}
vec3 getLightProbeGridIrradiance( highp sampler3D probesSH, vec3 probesMin, vec3 probesMax, vec3 probesResolution, vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 probeSpacing = gridRange / res;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.5 / res, 1.0 - 0.5 / res );
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	#if defined( USE_COLOR_ALPHA )
		vColor *= morphTargetBaseInfluence;
	#elif defined( USE_COLOR )
		vColor.rgb *= morphTargetBaseInfluence;
	#endif
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float lightDistance = length( lightToPosition );
			float depthRange = shadowCameraFar - shadowCameraNear;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float depthA = - shadowCameraNear / depthRange - shadowBias;
				float depthB = shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#else
				float depthA = shadowCameraFar / depthRange + shadowBias;
				float depthB = - shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			shadow = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 offset = vogelDiskSample( i, 5, phi );
				vec3 direction = bd3D + ( tangent * offset.x + bitangent * offset.y ) * texelSize;
				vec3 absDirection = abs( direction );
				float dp = depthA + depthB / max( max( absDirection.x, absDirection.y ), absDirection.z );
				shadow += texture( shadowMap, vec4( direction, dp ) );
			}
			shadow *= 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	uniform mat3 diffuseRoughnessMapTransform;
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	vDiffuseRoughnessMapUv = ( diffuseRoughnessMapTransform * vec3( DIFFUSE_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <envmap_common_pars_fragment>
void main() {
	#ifdef ENVMAP_TYPE_PMREM
		vec4 texColor = textureLod( envMap, backgroundRotation * vWorldDirection, roughnessToMip( backgroundBlurriness ) );
	#else
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DIFFUSE_ROUGHNESS
	uniform float diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		uniform sampler2D diffuseRoughnessMap;
	#endif
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},q={common:{diffuse:{value:new i(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new R},alphaMap:{value:null},alphaMapTransform:{value:new R},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new R}},envmap:{envMap:{value:null},envMapRotation:{value:new R},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new R}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new R}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new R},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new R},normalScale:{value:new r(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new R},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new R}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new R}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new R}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new i(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:[]},probesMin:{value:[]},probesMax:{value:[]},probesResolution:{value:[]}},points:{diffuse:{value:new i(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new R},alphaTest:{value:0},uvTransform:{value:new R}},sprite:{diffuse:{value:new i(16777215)},opacity:{value:1},center:{value:new r(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new R},alphaMap:{value:null},alphaMapTransform:{value:new R},alphaTest:{value:0}}},Jt={basic:{uniforms:L([q.common,q.specularmap,q.envmap,q.aomap,q.lightmap,q.fog]),vertexShader:K.meshbasic_vert,fragmentShader:K.meshbasic_frag},lambert:{uniforms:L([q.common,q.specularmap,q.envmap,q.aomap,q.lightmap,q.emissivemap,q.bumpmap,q.normalmap,q.displacementmap,q.fog,q.lights,{emissive:{value:new i(0)},envMapIntensity:{value:1}}]),vertexShader:K.meshlambert_vert,fragmentShader:K.meshlambert_frag},phong:{uniforms:L([q.common,q.specularmap,q.envmap,q.aomap,q.lightmap,q.emissivemap,q.bumpmap,q.normalmap,q.displacementmap,q.fog,q.lights,{emissive:{value:new i(0)},specular:{value:new i(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:K.meshphong_vert,fragmentShader:K.meshphong_frag},standard:{uniforms:L([q.common,q.envmap,q.aomap,q.lightmap,q.emissivemap,q.bumpmap,q.normalmap,q.displacementmap,q.roughnessmap,q.metalnessmap,q.fog,q.lights,{emissive:{value:new i(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:K.meshphysical_vert,fragmentShader:K.meshphysical_frag},toon:{uniforms:L([q.common,q.aomap,q.lightmap,q.emissivemap,q.bumpmap,q.normalmap,q.displacementmap,q.gradientmap,q.fog,q.lights,{emissive:{value:new i(0)}}]),vertexShader:K.meshtoon_vert,fragmentShader:K.meshtoon_frag},matcap:{uniforms:L([q.common,q.bumpmap,q.normalmap,q.displacementmap,q.fog,{matcap:{value:null}}]),vertexShader:K.meshmatcap_vert,fragmentShader:K.meshmatcap_frag},points:{uniforms:L([q.points,q.fog]),vertexShader:K.points_vert,fragmentShader:K.points_frag},dashed:{uniforms:L([q.common,q.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:K.linedashed_vert,fragmentShader:K.linedashed_frag},depth:{uniforms:L([q.common,q.displacementmap]),vertexShader:K.depth_vert,fragmentShader:K.depth_frag},normal:{uniforms:L([q.common,q.bumpmap,q.normalmap,q.displacementmap,{opacity:{value:1}}]),vertexShader:K.meshnormal_vert,fragmentShader:K.meshnormal_frag},sprite:{uniforms:L([q.sprite,q.fog]),vertexShader:K.sprite_vert,fragmentShader:K.sprite_frag},background:{uniforms:{uvTransform:{value:new R},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:K.background_vert,fragmentShader:K.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new R}},vertexShader:K.backgroundCube_vert,fragmentShader:K.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:K.cube_vert,fragmentShader:K.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:K.equirect_vert,fragmentShader:K.equirect_frag},distance:{uniforms:L([q.common,q.displacementmap,{referencePosition:{value:new W},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:K.distance_vert,fragmentShader:K.distance_frag},shadow:{uniforms:L([q.lights,q.fog,{color:{value:new i(0)},opacity:{value:1}}]),vertexShader:K.shadow_vert,fragmentShader:K.shadow_frag}};Jt.physical={uniforms:L([Jt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new R},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new R},clearcoatNormalScale:{value:new r(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new R},diffuseRoughness:{value:0},diffuseRoughnessMap:{value:null},diffuseRoughnessMapTransform:{value:new R},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new R},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new R},sheen:{value:0},sheenColor:{value:new i(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new R},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new R},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new R},transmissionSamplerSize:{value:new r},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new R},attenuationDistance:{value:0},attenuationColor:{value:new i(0)},specularColor:{value:new i(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new R},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new R},anisotropyVector:{value:new r},anisotropyMap:{value:null},anisotropyMapTransform:{value:new R}}]),vertexShader:K.meshphysical_vert,fragmentShader:K.meshphysical_frag};var Yt={r:0,b:0,g:0},Xt=new ut,Zt=new R;Zt.set(-1,0,0,0,1,0,0,0,1);function Qt(e,t,n,r,a,o){let s=new i(0),c=a===!0?0:1,l,u,d=null,f=0,p=null;function m(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function h(t){let r=!1,i=m(t);i===null?_(s,c):i&&i.isColor&&(_(i,1),r=!0);let a=e.xr.getEnvironmentBlendMode();a===`additive`?n.buffers.color.setClear(0,0,0,1,o):a===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,o),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function g(t,n){let i=m(n);i&&i.isCubeTexture?(u===void 0&&(u=new St(new he(1,1,1),new qe({name:`BackgroundCubeMaterial`,uniforms:w(Jt.backgroundCube.uniforms),vertexShader:Jt.backgroundCube.vertexShader,fragmentShader:Jt.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute(`normal`),u.geometry.deleteAttribute(`uv`),u.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(u)),u.material.uniforms.envMap.value=i,u.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(Xt.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isRenderTargetTexture===!1&&u.material.uniforms.backgroundRotation.value.premultiply(Zt),u.material.toneMapped=Qe.getTransfer(i.colorSpace)!==mt,(d!==i||f!==i.version||p!==e.toneMapping)&&(u.material.needsUpdate=!0,d=i,f=i.version,p=e.toneMapping),u.layers.enableAll(),t.unshift(u,u.geometry,u.material,0,0,null)):i&&i.isTexture&&(l===void 0&&(l=new St(new Ae(2,2),new qe({name:`BackgroundMaterial`,uniforms:w(Jt.background.uniforms),vertexShader:Jt.background.vertexShader,fragmentShader:Jt.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(l)),l.material.uniforms.t2D.value=i,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.toneMapped=Qe.getTransfer(i.colorSpace)!==mt,i.matrixAutoUpdate===!0&&i.updateMatrix(),l.material.uniforms.uvTransform.value.copy(i.matrix),(d!==i||f!==i.version||p!==e.toneMapping)&&(l.material.needsUpdate=!0,d=i,f=i.version,p=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null))}function _(t,r){t.getRGB(Yt,x(e)),n.buffers.color.setClear(Yt.r,Yt.g,Yt.b,r,o)}function v(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return s},setClearColor:function(e,t=1){s.set(e),c=t,_(s,c)},getClearAlpha:function(){return c},setClearAlpha:function(e){c=e,_(s,c)},render:h,addToRenderList:g,dispose:v}}function $t(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.isInterleavedBuffer===!0?t.stride:t.itemSize,p=s.offset;if(t.isInstancedInterleavedBuffer||t.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function en(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function tn(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&n!==1015&&!i&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE))}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(k(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`),f=n.logarithmicDepthBuffer===!0&&d===!1;n.reversedDepthBuffer===!0&&d===!1&&k(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`),n.logarithmicDepthBuffer===!0&&d===!0&&k(`WebGLRenderer: Logarithmic depth buffer is ignored when reversed depth buffer is enabled.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:f,reversedDepthBuffer:d,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function nn(e){let t=this,n=null,r=0,i=!1,a=!1,o=new Ue,s=new R,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var rn=class extends F{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new se(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new he(5,5,5),i=new qe({name:`CubemapFromEquirect`,uniforms:w(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new St(r,i),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=H),new ne(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}},an=256,on=3,sn=20,cn=256,ln=16,un=3,dn=new W,fn=new i,pn=class e{constructor(e){this._renderer=e,this._cubeSize=0,this._sourceTarget=null,this._cubeCamera=new ne(1,10,null),this._boxMesh=new St(new he(5,5,5),null),this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null,this._integrationMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=dn}=i,s=this._renderer;this._setSize(a);let c=this._allocateTarget(),l=this._getSourceTarget(!0);t>0&&(l.texture.mipmapsAutoUpdate=!1);let u=s.autoClear,d=s.autoClearColor,f=s.autoClearDepth,p=s.autoClearStencil,m=e.background;s.autoClear=!0,s.autoClearColor=!0,s.autoClearDepth=!0,s.autoClearStencil=!0,m===null&&(e.background=s.getClearColor(fn));let h=new ne(n,r,l);return h.position.copy(o),h.update(s,e),s.autoClear=u,s.autoClearColor=d,s.autoClearDepth=f,s.autoClearStencil=p,e.background=m,t>0&&(l.texture.mipmapsAutoUpdate=!0,this._blur(c,t)),this._applyPMREM(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=bn(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=yn(),this._compileMaterial(this._equirectMaterial))}dispose(){this._sourceTarget!==null&&this._sourceTarget.dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._integrationMaterial!==null&&this._integrationMaterial.dispose(),this._boxMesh.geometry.dispose()}static lodToRoughness(e,t){return t>0?1-Math.sqrt(1-e/t):0}_setSize(e){this._cubeSize=Math.max(an,o(e))}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?an:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4);let n=t||this._allocateTarget();return this._textureToCubemap(e),this._applyPMREM(n),n}_allocateTarget(){let e=this._cubeSize,t=mn(e,!1,!1),n=Math.log2(e)-on;for(let r=0;r<=n;r++)t.texture.mipmaps.push({width:e>>r,height:e>>r});return t.texture.name=`PMREM`,t.texture.isPMREMTexture=!0,t}_getSourceTarget(e=!1){let t=this._cubeSize,n=this._sourceTarget;return(n===null||n.width!==t||e&&n.depthBuffer===!1)&&(n!==null&&n.dispose(),this._sourceTarget=mn(t,!0,e)),this._sourceTarget}_compileMaterial(e){this._boxMesh.material=e,this._renderer.compile(this._boxMesh,this._cubeCamera.children[0])}_renderCube(e,t,n){let r=this._boxMesh,i=this._cubeCamera;r.material=n,i.renderTarget=e,i.activeMipmapLevel=t;let a=e.width>>t;e.viewport.set(0,0,a,a),i.update(this._renderer,r),e.viewport.set(0,0,e.width,e.height)}_textureToCubemap(e){let t;e.mapping===301||e.mapping===302?(this._cubemapMaterial===null&&(this._cubemapMaterial=bn()),t=this._cubemapMaterial,t.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):(this._equirectMaterial===null&&(this._equirectMaterial=yn()),t=this._equirectMaterial),t.uniforms.envMap.value=e,this._renderCube(this._getSourceTarget(),0,t)}_applyPMREM(t){this._ggxMaterial===null&&(this._ggxMaterial=gn(),this._integrationMaterial=_n());let n=this._cubeSize,r=t.texture.mipmaps.length-1,i=this._ggxMaterial.uniforms;i.envMap.value=this._sourceTarget.texture;let a=this._integrationMaterial.uniforms;a.envMap.value=this._sourceTarget.texture,a.sourceLod.value=Math.log2(n/ln);for(let o=0;o<=r;o++){let s=e.lodToRoughness(o,r);if(o>r-un)a.roughness.value=s,this._renderCube(t,o,this._integrationMaterial);else{let e=s>0?Math.log2(n)+.5*Math.log2(6/(cn*s**4))+.5:0;i.roughness.value=s,i.lodBias.value=e,this._renderCube(t,o,this._ggxMaterial)}}}_blur(e,t){this._blurMaterial===null&&(this._blurMaterial=vn());let n=this._blurMaterial,r=n.uniforms,i=this._sourceTarget;r.sigma.value=Math.min(t,Math.PI)/Math.SQRT2,r.envMap.value=i.texture,this._renderCube(e,0,n),r.envMap.value=e.texture,this._renderCube(i,0,n)}};function mn(e,t,n){return new rn(e,{minFilter:Tt,generateMipmaps:t,type:Oe,colorSpace:yt,depthBuffer:n})}function hn(e,t,n){return new qe({name:e,uniforms:t,vertexShader:K.cube_vert,fragmentShader:n,side:1,blending:0,depthTest:!1,depthWrite:!1})}function gn(){return hn(`PMREMGGXConvolution`,{envMap:{value:null},roughness:{value:0},lodBias:{value:0}},`

		#define GGX_SAMPLES ${cn}u

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float lodBias;

		#include <common>

		// Van der Corput radical inverse
		float radicalInverse_VdC( uint bits ) {

			bits = ( bits << 16u ) | ( bits >> 16u );
			bits = ( ( bits & 0x55555555u ) << 1u ) | ( ( bits & 0xAAAAAAAAu ) >> 1u );
			bits = ( ( bits & 0x33333333u ) << 2u ) | ( ( bits & 0xCCCCCCCCu ) >> 2u );
			bits = ( ( bits & 0x0F0F0F0Fu ) << 4u ) | ( ( bits & 0xF0F0F0F0u ) >> 4u );
			bits = ( ( bits & 0x00FF00FFu ) << 8u ) | ( ( bits & 0xFF00FF00u ) >> 8u );
			return float( bits ) * 2.3283064365386963e-10; // / 0x100000000

		}

		// Hammersley sequence
		vec2 hammersley( uint i, uint N ) {

			return vec2( float( i ) / float( N ), radicalInverse_VdC( i ) );

		}

		void main() {

			vec3 N = normalize( vWorldDirection );

			// For very low roughness, just sample the environment directly
			if ( roughness < 0.001 ) {

				gl_FragColor = vec4( textureLod( envMap, N, 0.0 ).rgb, 1.0 );
				return;

			}

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			// Tangent space basis for VNDF sampling
			vec3 up = abs( N.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, N ) );
			vec3 bitangent = cross( N, tangent );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			for ( uint i = 0u; i < GGX_SAMPLES; i ++ ) {

				vec2 Xi = hammersley( i, GGX_SAMPLES );

				// With V = N, sample the reflected direction directly.
				float invQ = 1.0 / ( 1.0 - Xi.x + alpha2 * Xi.x );
				float NdotL = ( 1.0 - Xi.x - alpha2 * Xi.x ) * invQ;

				if ( NdotL > 0.0 ) {

					float phi = 2.0 * PI * Xi.y;
					float sinTheta = 2.0 * alpha * sqrt( Xi.x * ( 1.0 - Xi.x ) ) * invQ;
					vec3 L = N * NdotL + ( tangent * cos( phi ) + bitangent * sin( phi ) ) * sinTheta;

					// Match the source mip to the sample's solid angle. The terms
					// independent of the sample are precomputed in lodBias.
					float d = alpha2 * invQ;
					float lod = max( log2( d ) + lodBias, 0.0 );

					// Weight by NdotL for the split-sum approximation
					prefilteredColor += textureLod( envMap, L, lod ).rgb * NdotL;
					totalWeight += NdotL;

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function _n(){return hn(`PMREMGGXIntegration`,{envMap:{value:null},roughness:{value:0},sourceLod:{value:0},sourceSize:{value:ln}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float sourceLod;
		uniform int sourceSize;

		void main() {

			vec3 N = normalize( vWorldDirection );

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			float texelSize = 2.0 / float( sourceSize );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			// Pair opposite texels: only the one in N's hemisphere contributes.
			for ( int face = 0; face < 3; face ++ ) {

				for ( int y = 0; y < sourceSize; y ++ ) {

					for ( int x = 0; x < sourceSize; x ++ ) {

						vec2 uv = ( vec2( x, y ) + 0.5 ) * texelSize - 1.0;
						vec3 texelDirection = face == 0 ? vec3( 1.0, uv ) : ( face == 1 ? vec3( uv.x, 1.0, uv.y ) : vec3( uv, 1.0 ) );

						float invDistance = inversesqrt( 1.0 + dot( uv, uv ) );
						float NdotL = dot( N, texelDirection );
						texelDirection *= NdotL < 0.0 ? - 1.0 : 1.0;
						NdotL = abs( NdotL ) * invDistance;

						// With V = N, NdotH squared is ( 1 + NdotL ) / 2. Common factors
						// in the GGX distribution and texel solid angle cancel when normalized.
						float d = 1.0 + alpha2 + ( alpha2 - 1.0 ) * NdotL;
						float weight = NdotL * invDistance * invDistance * invDistance / ( d * d );

						prefilteredColor += textureLod( envMap, texelDirection, sourceLod ).rgb * weight;
						totalWeight += weight;

					}

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function vn(){return hn(`PMREMSphericalGaussianBlur`,{envMap:{value:null},sigma:{value:0}},`

		#define SAMPLES ${sn}
		#define GOLDEN_ANGLE 2.39996322973

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float sigma;

		#include <common>

		void main() {

			vec3 outputDirection = normalize( vWorldDirection );

			vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, outputDirection ) );
			vec3 bitangent = cross( outputDirection, tangent );

			// Truncate the kernel at three standard deviations or at the antipode.
			float thetaMax = min( 3.0 * sigma, PI );
			float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

			vec3 accumColor = vec3( 0.0 );
			float accumWeight = 0.0;

			for ( int i = 0; i < SAMPLES; i ++ ) {

				// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
				float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
				float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
				float phi = float( i ) * GOLDEN_ANGLE;

				vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
				vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

				// Correct the planar sample density to solid angle.
				float weight = sin( theta ) / theta;

				accumColor += weight * textureLod( envMap, sampleDirection, 0.0 ).rgb;
				accumWeight += weight;

			}

			gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

		}
	`)}function yn(){return hn(`PMREMEquirectangularToCubemap`,{envMap:{value:null}},`

		varying vec3 vWorldDirection;

		uniform sampler2D envMap;

		#include <common>

		void main() {

			// Average four subpixel samples to preserve small, bright features.
			vec3 direction = normalize( vWorldDirection );
			vec3 dx = dFdx( direction ) * 0.25;
			vec3 dy = dFdy( direction ) * 0.25;

			vec3 color = textureLod( envMap, equirectUv( normalize( direction - dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction - dx + dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx + dy ) ), 0.0 ).rgb;
			gl_FragColor = vec4( color * 0.25, 1.0 );

		}
	`)}function bn(){return hn(`PMREMCubemapToCubemap`,{envMap:{value:null},flipEnvMap:{value:-1}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float flipEnvMap;

		void main() {

			gl_FragColor = vec4( textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ).rgb, 1.0 );

		}
	`)}function xn(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304){if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}{let r=n.image;if(r&&r.height>0){let i=new rn(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}}return n}function o(t){if(t&&t.isTexture&&t.isPMREMTexture!==!0){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new pn(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new pn(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function Sn(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&_t(`WebGLRenderer: `+e+` extension not supported.`),t}}}function Cn(e,t,n,r){let i={},a=new WeakMap,o=new FinalizationRegistry(e=>delete i[e]);function s(e){c(e.target)}function c(e){e.index!==null&&t.remove(e.index);for(let n in e.attributes)t.remove(e.attributes[n]);e.removeEventListener(`dispose`,s),delete i[e.id],o.unregister(e);let c=a.get(e);c&&(t.remove(c),a.delete(e)),r.releaseStatesOfGeometry(e),e.isInstancedBufferGeometry===!0&&delete e._maxInstanceCount,n.memory.geometries--}function l(e,t){return i[t.id]===void 0&&(t.addEventListener(`dispose`,s),i[t.id]=new WeakRef(t),o.register(t,t.id,t),n.memory.geometries++),t}function u(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function d(e){let n=e.index,r=e.attributes.position,i=0;if(r===void 0)return;let o=n===null?r.array.length/3-1:n.array.length,s=new(r.count>=65535?z:Bt)(Math.ceil(o/3)*6,1),c=s.array;if(n!==null){let e=n.array;i=n.version;for(let t=0,n=0;t<o;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];c[n++]=r,c[n++]=i,c[n++]=i,c[n++]=a,c[n++]=a,c[n++]=r}}else{i=r.version;for(let e=0,t=0;e<o;e+=3){let n=e+0,r=e+1,i=e+2;c[t++]=n,c[t++]=r,c[t++]=r,c[t++]=i,c[t++]=i,c[t++]=n}}s.version=i;let l=a.get(e);l&&t.remove(l),a.set(e,s)}function f(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&d(e)}else d(e);return a.get(e)}function p(){for(let e in i){let t=i[e].deref();t!==void 0&&c(t)}}return{get:l,update:u,getWireframeAttribute:f,dispose:p}}function wn(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function Tn(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:Ht(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function En(e,t,n){let i=new WeakMap,a=new te;function o(o,s,c){let l=o.morphTargetInfluences,u=s.morphAttributes.position||s.morphAttributes.normal||s.morphAttributes.color,d=u===void 0?0:u.length,f=i.get(s);if(f===void 0||f.count!==d){f!==void 0&&f.texture.dispose();let e=s.morphAttributes.position!==void 0,n=s.morphAttributes.normal!==void 0,o=s.morphAttributes.color!==void 0,c=s.morphAttributes.position||[],l=s.morphAttributes.normal||[],u=s.morphAttributes.color||[],p=0;e===!0&&(p=1),n===!0&&(p=2),o===!0&&(p=3);let m=s.attributes.position.count*p,h=1;m>t.maxTextureSize&&(h=Math.ceil(m/t.maxTextureSize),m=t.maxTextureSize);let g=new Float32Array(m*h*4*d),_=new T(g,m,h,d);_.type=A,_.needsUpdate=!0;let v=p*4;for(let t=0;t<d;t++){let r=c[t],i=l[t],s=u[t],d=m*h*4*t;for(let t=0;t<r.count;t++){let c=t*v;e===!0&&(a.fromBufferAttribute(r,t),g[d+c+0]=a.x,g[d+c+1]=a.y,g[d+c+2]=a.z,g[d+c+3]=0),n===!0&&(a.fromBufferAttribute(i,t),g[d+c+4]=a.x,g[d+c+5]=a.y,g[d+c+6]=a.z,g[d+c+7]=0),o===!0&&(a.fromBufferAttribute(s,t),g[d+c+8]=a.x,g[d+c+9]=a.y,g[d+c+10]=a.z,g[d+c+11]=s.itemSize===4?a.w:1)}}f={count:d,texture:_,size:new r(m,h)},i.set(s,f);function y(){_.dispose(),i.delete(s),s.removeEventListener(`dispose`,y)}s.addEventListener(`dispose`,y)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)c.getUniforms().setValue(e,`morphTexture`,o.morphTexture,n);else{let t=0;for(let e=0;e<l.length;e++)t+=l[e];let n=s.morphTargetsRelative?1:1-t;c.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),c.getUniforms().setValue(e,`morphTargetInfluences`,l)}c.getUniforms().setValue(e,`morphTargetsTexture`,f.texture,n),c.getUniforms().setValue(e,`morphTargetsTextureSize`,f.size)}return{update:o}}function Dn(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var On={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function kn(e,t,n,r,i,a){let o=new F(t,n,{type:e,depthBuffer:i,stencilBuffer:a,samples:r?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),c=null,l=null,d=null,f=new u;f.setAttribute(`position`,new y([-1,3,0,-1,-1,0,3,-1,0],3)),f.setAttribute(`uv`,new y([0,2,0,0,2,0],2));let p=new bt({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),m=new St(f,p),h=new it(-1,1,1,-1,0,1),g=null,_=null,v=!1,b,x=null,S=[],C=!1;this.setSize=function(e,t){o.setSize(e,t),c!==null&&c.setSize(e,t),l!==null&&l.setSize(e,t);for(let n=0;n<S.length;n++){let r=S[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){S=e,C=S.length>0&&S[0].isRenderPass===!0;let t=o.width,n=o.height;S.length>0&&c===null&&(c=new F(t,n,{type:Oe,depthBuffer:!1,stencilBuffer:!1}),l=new F(t,n,{type:Oe,depthBuffer:!1,stencilBuffer:!1}));let r=i===!0&&S.some(e=>e.needsDepthTexture===!0);r!==(o.depthTexture!==null)&&(r===!0&&d===null&&(d=new s(t,n),a===!0&&(d.format=Ut,d.type=Ft)),o.dispose(),o.depthTexture=r?d:null,o.resolveDepthBuffer=r,o.storeMultisampledDepthBuffer=r);for(let e=0;e<S.length;e++){let i=S[e];i.setSize&&i.setSize(t,n),r&&i.needsDepthTexture===!0&&i.setDepthTexture&&i.setDepthTexture(d)}},this.begin=function(e,t){if(v||e.toneMapping===0&&S.length===0)return!1;if(x=t,t!==null){let e=t.width,n=t.height;(o.width!==e||o.height!==n)&&this.setSize(e,n)}return C===!1&&e.setRenderTarget(o),b=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return C},this.end=function(e,t){e.toneMapping=b,v=!0;let n=o,r=c;for(let i=0;i<S.length;i++){let a=S[i];a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1&&(n=r,r=r===c?l:c))}if(g!==e.outputColorSpace||_!==e.toneMapping){g=e.outputColorSpace,_=e.toneMapping,p.defines={},Qe.getTransfer(g)===`srgb`&&(p.defines.SRGB_TRANSFER=``);let t=On[_];t&&(p.defines[t]=``),p.needsUpdate=!0}p.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(x),e.render(m,h),x=null,v=!1},this.isCompositing=function(){return v},this.dispose=function(){o.dispose(),c!==null&&c.dispose(),l!==null&&l.dispose(),f.dispose(),p.dispose()}}var An=new je,jn=new s(1,1),Mn=new ie(1),Nn=new T,Pn=new g,Fn=new se,In=[],Ln=[],Rn=new Float32Array(16),zn=new Float32Array(9),Bn=new Float32Array(4);function Vn(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=In[i];if(a===void 0&&(a=new Float32Array(i),In[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function Hn(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function Un(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function Wn(e,t){let n=Ln[t];n===void 0&&(n=new Int32Array(t),Ln[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function Gn(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function Kn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Hn(n,t))return;e.uniform2fv(this.addr,t),Un(n,t)}}function qn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(Hn(n,t))return;e.uniform3fv(this.addr,t),Un(n,t)}}function Jn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Hn(n,t))return;e.uniform4fv(this.addr,t),Un(n,t)}}function Yn(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Hn(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),Un(n,t)}else{if(Hn(n,r))return;Bn.set(r),e.uniformMatrix2fv(this.addr,!1,Bn),Un(n,r)}}function Xn(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Hn(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),Un(n,t)}else{if(Hn(n,r))return;zn.set(r),e.uniformMatrix3fv(this.addr,!1,zn),Un(n,r)}}function Zn(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Hn(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),Un(n,t)}else{if(Hn(n,r))return;Rn.set(r),e.uniformMatrix4fv(this.addr,!1,Rn),Un(n,r)}}function Qn(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function $n(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Hn(n,t))return;e.uniform2iv(this.addr,t),Un(n,t)}}function er(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Hn(n,t))return;e.uniform3iv(this.addr,t),Un(n,t)}}function tr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Hn(n,t))return;e.uniform4iv(this.addr,t),Un(n,t)}}function nr(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function rr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Hn(n,t))return;e.uniform2uiv(this.addr,t),Un(n,t)}}function ir(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Hn(n,t))return;e.uniform3uiv(this.addr,t),Un(n,t)}}function ar(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Hn(n,t))return;e.uniform4uiv(this.addr,t),Un(n,t)}}function or(e){return e.version===0&&(e.compareFunction=519,e.needsUpdate=!0),e}function sr(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;a=this.type===e.SAMPLER_2D_SHADOW?or(jn):An,n.setTexture2D(t||a,i)}function cr(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||Pn,i)}function lr(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;a=this.type===e.SAMPLER_CUBE_SHADOW?or(Mn):Fn,n.setTextureCube(t||a,i)}function ur(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||Nn,i)}function dr(e){switch(e){case 5126:return Gn;case 35664:return Kn;case 35665:return qn;case 35666:return Jn;case 35674:return Yn;case 35675:return Xn;case 35676:return Zn;case 5124:case 35670:return Qn;case 35667:case 35671:return $n;case 35668:case 35672:return er;case 35669:case 35673:return tr;case 5125:return nr;case 36294:return rr;case 36295:return ir;case 36296:return ar;case 35678:case 36198:case 36298:case 36306:case 35682:return sr;case 35679:case 36299:case 36307:return cr;case 35680:case 36300:case 36308:case 36293:return lr;case 36289:case 36303:case 36311:case 36292:return ur}}function fr(e,t){e.uniform1fv(this.addr,t)}function pr(e,t){let n=Vn(t,this.size,2);e.uniform2fv(this.addr,n)}function mr(e,t){let n=Vn(t,this.size,3);e.uniform3fv(this.addr,n)}function hr(e,t){let n=Vn(t,this.size,4);e.uniform4fv(this.addr,n)}function gr(e,t){let n=Vn(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function _r(e,t){let n=Vn(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function vr(e,t){let n=Vn(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function yr(e,t){e.uniform1iv(this.addr,t)}function br(e,t){e.uniform2iv(this.addr,t)}function xr(e,t){e.uniform3iv(this.addr,t)}function Sr(e,t){e.uniform4iv(this.addr,t)}function Cr(e,t){e.uniform1uiv(this.addr,t)}function wr(e,t){e.uniform2uiv(this.addr,t)}function Tr(e,t){e.uniform3uiv(this.addr,t)}function Er(e,t){e.uniform4uiv(this.addr,t)}function Dr(e,t,n){let r=this.cache,i=t.length,a=Wn(n,i);Hn(r,a)||(e.uniform1iv(this.addr,a),Un(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?or(jn):An;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function Or(e,t,n){let r=this.cache,i=t.length,a=Wn(n,i);Hn(r,a)||(e.uniform1iv(this.addr,a),Un(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||Pn,a[e])}function kr(e,t,n){let r=this.cache,i=t.length,a=Wn(n,i);Hn(r,a)||(e.uniform1iv(this.addr,a),Un(r,a));let o;o=this.type===e.SAMPLER_CUBE_SHADOW?or(Mn):Fn;for(let e=0;e!==i;++e)n.setTextureCube(t[e]||o,a[e])}function Ar(e,t,n){let r=this.cache,i=t.length,a=Wn(n,i);Hn(r,a)||(e.uniform1iv(this.addr,a),Un(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||Nn,a[e])}function jr(e){switch(e){case 5126:return fr;case 35664:return pr;case 35665:return mr;case 35666:return hr;case 35674:return gr;case 35675:return _r;case 35676:return vr;case 5124:case 35670:return yr;case 35667:case 35671:return br;case 35668:case 35672:return xr;case 35669:case 35673:return Sr;case 5125:return Cr;case 36294:return wr;case 36295:return Tr;case 36296:return Er;case 35678:case 36198:case 36298:case 36306:case 35682:return Dr;case 35679:case 36299:case 36307:return Or;case 35680:case 36300:case 36308:case 36293:return kr;case 36289:case 36303:case 36311:case 36292:return Ar}}var Mr=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=dr(t.type)}},Nr=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=jr(t.type)}},Pr=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},Fr=/(\w+)(\])?(\[|\.)?/g;function Ir(e,t){e.seq.push(t),e.map[t.id]=t}function Lr(e,t,n){let r=e.name,i=r.length;for(Fr.lastIndex=0;;){let a=Fr.exec(r),o=Fr.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){Ir(n,l===void 0?new Mr(s,e,t):new Nr(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new Pr(s),Ir(n,e)),n=e}}}var Rr=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);Lr(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function zr(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var Br=37297,Vr=0;function Hr(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var Ur=new R;function Wr(e){Qe._getMatrix(Ur,Qe.workingColorSpace,e);let t=`mat3( ${Ur.elements.map(e=>e.toFixed(4))} )`;switch(Qe.getTransfer(e)){case Ye:return[t,`LinearTransferOETF`];case mt:return[t,`sRGBTransferOETF`];default:return k(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function Gr(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+Hr(e.getShaderSource(t),r)}return i}function Kr(e,t){let n=Wr(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( ${n[0]} * value.rgb, value.a ) );`,`}`].join(`
`)}var qr={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function Jr(e,t){let n=qr[t];return n===void 0?(k(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var Yr=new W;function Xr(){return Qe.getLuminanceCoefficients(Yr),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${Yr.x.toFixed(4)}, ${Yr.y.toFixed(4)}, ${Yr.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function Zr(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(ei).join(`
`)}function Qr(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function $r(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function ei(e){return e!==``}function ti(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows).replace(/NUM_LIGHT_PROBE_GRIDS/g,t.numLightProbeGrids)}function ni(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var ri=/^[ \t]*#include +<([\w\d./]+)>/gm;function ii(e){return e.replace(ri,ai)}function ai(e,t){let n=K[t];if(n===void 0)throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`);return ii(n)}var oi=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function si(e){return e.replace(oi,ci)}function ci(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function li(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var ui={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function di(e){return ui[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var fi={302:`ENVMAP_MODE_REFRACTION`};function pi(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:fi[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var mi={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function hi(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:mi[e.combine]||`ENVMAP_BLENDING_NONE`}function gi(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=di(n),l=n.envMapPMREM===!0?`ENVMAP_TYPE_PMREM`:`ENVMAP_TYPE_CUBE`,u=pi(n),d=hi(n),f=Zr(n),p=Qr(a),m=i.createProgram(),h,g,_=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(h=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p].filter(ei).join(`
`),h.length>0&&(h+=`
`),g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p].filter(ei).join(`
`),g.length>0&&(g+=`
`)):(h=[li(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.diffuseRoughnessMap?`#define USE_DIFFUSE_ROUGHNESSMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.diffuseRoughnessMapUv?`#define DIFFUSE_ROUGHNESSMAP_UV `+n.diffuseRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(ei).join(`
`),g=[li(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,n.envMapPMREM?`#define ENVMAP_MAX_LOD `+n.envMapMaxLod+`.0`:``,n.envMapPMREM?`#define ENVMAP_SIZE `+n.envMapSize+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.diffuseRoughness?`#define USE_DIFFUSE_ROUGHNESS`:``,n.diffuseRoughnessMap?`#define USE_DIFFUSE_ROUGHNESSMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.retroreflection?`#define USE_RETROREFLECTION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:K.tonemapping_pars_fragment,n.toneMapping===0?``:Jr(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,K.colorspace_pars_fragment,Kr(`linearToOutputTexel`,n.outputColorSpace),Xr(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(ei).join(`
`)),o=ii(o),o=ti(o,n),o=ni(o,n),s=ii(s),s=ti(s,n),s=ni(s,n),o=si(o),s=si(s),n.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,h=[f,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+h,g=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+g);let v=_+h+o,y=_+g+s,b=zr(i,i.VERTEX_SHADER,v),x=zr(i,i.FRAGMENT_SHADER,y);i.attachShader(m,b),i.attachShader(m,x),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(m,0,`position`):i.bindAttribLocation(m,0,n.index0AttributeName),i.linkProgram(m);function S(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(m)||``,r=i.getShaderInfoLog(b)||``,a=i.getShaderInfoLog(x)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(m,i.LINK_STATUS)===!1){if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,m,b,x);else{let e=Gr(i,b,`vertex`),n=Gr(i,x,`fragment`);Ht(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(m,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}}else o===``?(s===``||c===``)&&(u=!1):k(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:h},fragmentShader:{log:c,prefix:g}})}i.deleteShader(b),i.deleteShader(x),C=new Rr(i,m),w=$r(i,m)}let C;this.getUniforms=function(){return C===void 0&&S(this),C};let w;this.getAttributes=function(){return w===void 0&&S(this),w};let T=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return T===!1&&(T=i.getProgramParameter(m,Br)),T},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(m),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=Vr++,this.cacheKey=t,this.usedTimes=1,this.program=m,this.vertexShader=b,this.fragmentShader=x,this}var _i=0,vi=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new yi(e),t.set(e,n)),n}},yi=class{constructor(e){this.id=_i++,this.code=e,this.usedTimes=0}};function bi(e){return e===1030||e===37490||e===36285}function xi(e,n,r,i,a,o){let s=new t,c=new vi,l=new Set,u=[],d=new Map,f=i.logarithmicDepthBuffer,p={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function m(e){return l.add(e),e===0?`uv`:`uv${e}`}function h(t,a,s,u,d,h){let g=u.fog,_=d.geometry,v=t.isMeshStandardMaterial||t.isMeshLambertMaterial||t.isMeshPhongMaterial?u.environment:null,y=t.isMeshStandardMaterial||t.isMeshLambertMaterial&&!t.envMap||t.isMeshPhongMaterial&&!t.envMap,b=n.get(t.envMap||v,y),x=p[t.type],S=i.precision;t.precision!==null&&(S=i.getMaxPrecision(t.precision),S!==t.precision&&k(`WebGLProgram.getParameters:`,t.precision,`not supported, using`,S,`instead.`));let C=_.morphAttributes.position||_.morphAttributes.normal||_.morphAttributes.color,w=C===void 0?0:C.length,T=0;_.morphAttributes.position!==void 0&&(T=1),_.morphAttributes.normal!==void 0&&(T=2),_.morphAttributes.color!==void 0&&(T=3);let E,D,O,A;if(x){let e=Jt[x];E=e.vertexShader,D=e.fragmentShader}else{E=t.vertexShader,D=t.fragmentShader;let e=c.getVertexShaderStage(t),n=c.getFragmentShaderStage(t);c.update(t,e,n),O=e.id,A=n.id}let j=e.getRenderTarget(),ee=e.state.buffers.depth.getReversed(),M=d.isInstancedMesh===!0,N=d.isBatchedMesh===!0,te=!!t.map,ne=!!t.matcap,re=!!b,P=re&&b.isPMREMTexture===!0,ie=!!t.aoMap,ae=!!t.lightMap,oe=!!t.bumpMap&&t.wireframe===!1,F=!!t.normalMap,se=!!t.displacementMap,I=!!t.emissiveMap,ce=!!t.metalnessMap,le=!!t.roughnessMap,ue=t.anisotropy>0,de=t.clearcoat>0,fe=t.diffuseRoughness>0,pe=t.dispersion>0,me=t.retroreflectivity>0,he=t.iridescence>0,ge=t.sheen>0,_e=t.transmission>0,ve=ue&&!!t.anisotropyMap,ye=de&&!!t.clearcoatMap,be=de&&!!t.clearcoatNormalMap,xe=de&&!!t.clearcoatRoughnessMap,Se=fe&&!!t.diffuseRoughnessMap,L=he&&!!t.iridescenceMap,Ce=he&&!!t.iridescenceThicknessMap,we=ge&&!!t.sheenColorMap,Te=ge&&!!t.sheenRoughnessMap,Ee=!!t.specularMap,De=!!t.specularColorMap,Oe=!!t.specularIntensityMap,ke=_e&&!!t.transmissionMap,Ae=_e&&!!t.thicknessMap,je=!!t.gradientMap,R=!!t.alphaMap,Me=t.alphaTest>0,Ne=!!t.alphaHash,Pe=!!t.extensions,Fe=0;t.toneMapped&&(j===null||j.isXRRenderTarget===!0)&&(Fe=e.toneMapping);let z=P?b.isCompressedCubeTexture?b.image[0].mipmaps:b.mipmaps:null,B={shaderID:x,shaderType:t.type,shaderName:t.name,vertexShader:E,fragmentShader:D,defines:t.defines,customVertexShaderID:O,customFragmentShaderID:A,isRawShaderMaterial:t.isRawShaderMaterial===!0,glslVersion:t.glslVersion,precision:S,batching:N,batchingColor:N&&d._colorsTexture!==null,instancing:M,instancingColor:M&&d.instanceColor!==null,instancingMorph:M&&d.morphTexture!==null,outputColorSpace:j===null?e.outputColorSpace:j.isXRRenderTarget===!0?j.texture.colorSpace:Qe.workingColorSpace,alphaToCoverage:!!t.alphaToCoverage,map:te,matcap:ne,envMap:re,envMapMode:re&&b.mapping,envMapPMREM:P,envMapMaxLod:P?z.length-1:null,envMapSize:P?z[0].width:null,aoMap:ie,lightMap:ae,bumpMap:oe,normalMap:F,displacementMap:se,emissiveMap:I,normalMapObjectSpace:F&&t.normalMapType===1,normalMapTangentSpace:F&&t.normalMapType===0,packedNormalMap:F&&t.normalMapType===0&&bi(t.normalMap.format),metalnessMap:ce,roughnessMap:le,anisotropy:ue,anisotropyMap:ve,clearcoat:de,clearcoatMap:ye,clearcoatNormalMap:be,clearcoatRoughnessMap:xe,diffuseRoughness:fe,diffuseRoughnessMap:Se,dispersion:pe,retroreflection:me,iridescence:he,iridescenceMap:L,iridescenceThicknessMap:Ce,sheen:ge,sheenColorMap:we,sheenRoughnessMap:Te,specularMap:Ee,specularColorMap:De,specularIntensityMap:Oe,transmission:_e,transmissionMap:ke,thicknessMap:Ae,gradientMap:je,opaque:t.transparent===!1&&t.blending===1&&t.alphaToCoverage===!1,alphaMap:R,alphaTest:Me,alphaHash:Ne,combine:t.combine,mapUv:te&&m(t.map.channel),aoMapUv:ie&&m(t.aoMap.channel),lightMapUv:ae&&m(t.lightMap.channel),bumpMapUv:oe&&m(t.bumpMap.channel),normalMapUv:F&&m(t.normalMap.channel),displacementMapUv:se&&m(t.displacementMap.channel),emissiveMapUv:I&&m(t.emissiveMap.channel),metalnessMapUv:ce&&m(t.metalnessMap.channel),roughnessMapUv:le&&m(t.roughnessMap.channel),anisotropyMapUv:ve&&m(t.anisotropyMap.channel),clearcoatMapUv:ye&&m(t.clearcoatMap.channel),clearcoatNormalMapUv:be&&m(t.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:xe&&m(t.clearcoatRoughnessMap.channel),diffuseRoughnessMapUv:Se&&m(t.diffuseRoughnessMap.channel),iridescenceMapUv:L&&m(t.iridescenceMap.channel),iridescenceThicknessMapUv:Ce&&m(t.iridescenceThicknessMap.channel),sheenColorMapUv:we&&m(t.sheenColorMap.channel),sheenRoughnessMapUv:Te&&m(t.sheenRoughnessMap.channel),specularMapUv:Ee&&m(t.specularMap.channel),specularColorMapUv:De&&m(t.specularColorMap.channel),specularIntensityMapUv:Oe&&m(t.specularIntensityMap.channel),transmissionMapUv:ke&&m(t.transmissionMap.channel),thicknessMapUv:Ae&&m(t.thicknessMap.channel),alphaMapUv:R&&m(t.alphaMap.channel),vertexTangents:!!_.attributes.tangent&&(F||ue),vertexNormals:!!_.attributes.normal,vertexColors:t.vertexColors,vertexAlphas:t.vertexColors===!0&&!!_.attributes.color&&_.attributes.color.itemSize===4,pointsUvs:d.isPoints===!0&&!!_.attributes.uv&&(te||R),fog:!!g,useFog:t.fog===!0,fogExp2:!!g&&g.isFogExp2,flatShading:t.wireframe===!1&&(t.flatShading===!0||_.attributes.normal===void 0&&F===!1&&(t.isMeshLambertMaterial||t.isMeshPhongMaterial||t.isMeshStandardMaterial||t.isMeshPhysicalMaterial)),sizeAttenuation:t.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:ee,skinning:d.isSkinnedMesh===!0,hasPositionAttribute:_.attributes.position!==void 0,morphTargets:_.morphAttributes.position!==void 0,morphNormals:_.morphAttributes.normal!==void 0,morphColors:_.morphAttributes.color!==void 0,morphTargetsCount:w,morphTextureStride:T,numSunLights:a.sun.length,numDirLights:a.directional.length,numPointLights:a.point.length,numSpotLights:a.spot.length,numSpotLightMaps:a.spotLightMap.length,numRectAreaLights:a.rectArea.length,numHemiLights:a.hemi.length,numSunLightShadows:a.sunShadowMap.length,numDirLightShadows:a.directionalShadowMap.length,numPointLightShadows:a.pointShadowMap.length,numSpotLightShadows:a.spotShadowMap.length,numSpotLightShadowsWithMaps:a.numSpotLightShadowsWithMaps,numLightProbes:a.numLightProbes,numLightProbeGrids:h.filter(e=>e.texture!==null).length,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:t.dithering,shadowMapEnabled:e.shadowMap.enabled&&s.length>0,shadowMapType:e.shadowMap.type,toneMapping:Fe,decodeVideoTexture:te&&t.map.isVideoTexture===!0&&Qe.getTransfer(t.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:I&&t.emissiveMap.isVideoTexture===!0&&Qe.getTransfer(t.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:t.premultipliedAlpha,doubleSided:t.side===2,flipSided:t.side===1,useDepthPacking:t.depthPacking>=0,depthPacking:t.depthPacking||0,index0AttributeName:t.index0AttributeName,extensionClipCullDistance:Pe&&t.extensions.clipCullDistance===!0&&r.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(Pe&&t.extensions.multiDraw===!0||N)&&r.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:r.has(`KHR_parallel_shader_compile`),customProgramCacheKey:t.customProgramCacheKey()};return B.vertexUv1s=l.has(1),B.vertexUv2s=l.has(2),B.vertexUv3s=l.has(3),l.clear(),B}function g(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(_(n,t),v(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function _(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapPMREM),e.push(t.envMapMaxLod),e.push(t.envMapSize),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.diffuseRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.numSunLights),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numSunLightShadows),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.numLightProbeGrids),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function v(e,t){s.disableAll(),t.instancing&&s.enable(0),t.instancingColor&&s.enable(1),t.instancingMorph&&s.enable(2),t.matcap&&s.enable(3),t.envMap&&s.enable(4),t.normalMapObjectSpace&&s.enable(5),t.normalMapTangentSpace&&s.enable(6),t.clearcoat&&s.enable(7),t.iridescence&&s.enable(8),t.alphaTest&&s.enable(9),t.vertexColors&&s.enable(10),t.vertexAlphas&&s.enable(11),t.vertexUv1s&&s.enable(12),t.vertexUv2s&&s.enable(13),t.vertexUv3s&&s.enable(14),t.vertexTangents&&s.enable(15),t.anisotropy&&s.enable(16),t.alphaHash&&s.enable(17),t.batching&&s.enable(18),t.dispersion&&s.enable(19),t.retroreflection&&s.enable(24),t.diffuseRoughness&&s.enable(25),t.batchingColor&&s.enable(20),t.gradientMap&&s.enable(21),t.packedNormalMap&&s.enable(22),t.vertexNormals&&s.enable(23),e.push(s.mask),s.disableAll(),t.fog&&s.enable(0),t.useFog&&s.enable(1),t.flatShading&&s.enable(2),t.logarithmicDepthBuffer&&s.enable(3),t.reversedDepthBuffer&&s.enable(4),t.skinning&&s.enable(5),t.morphTargets&&s.enable(6),t.morphNormals&&s.enable(7),t.morphColors&&s.enable(8),t.premultipliedAlpha&&s.enable(9),t.shadowMapEnabled&&s.enable(10),t.doubleSided&&s.enable(11),t.flipSided&&s.enable(12),t.useDepthPacking&&s.enable(13),t.dithering&&s.enable(14),t.transmission&&s.enable(15),t.sheen&&s.enable(16),t.opaque&&s.enable(17),t.pointsUvs&&s.enable(18),t.decodeVideoTexture&&s.enable(19),t.decodeVideoTextureEmissive&&s.enable(20),t.alphaToCoverage&&s.enable(21),t.numLightProbeGrids>0&&s.enable(22),t.hasPositionAttribute&&s.enable(23),e.push(s.mask)}function y(e){let t=p[e.type],n;if(t){let e=Jt[t];n=Rt.clone(e.uniforms)}else n=e.uniforms;return n}function b(t,n){let r=d.get(n);return r===void 0?(r=new gi(e,n,t,a),u.push(r),d.set(n,r)):++r.usedTimes,r}function x(e){if(--e.usedTimes===0){let t=u.indexOf(e);u[t]=u[u.length-1],u.pop(),d.delete(e.cacheKey),e.destroy()}}function S(e){c.remove(e)}function C(){c.dispose()}return{getParameters:h,getProgramCacheKey:g,getUniforms:y,acquireProgram:b,releaseProgram:x,releaseShaderCache:S,programs:u,dispose:C}}function Si(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function Ci(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function wi(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Ti(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l,u){u.reversedDepth===!0&&(c=-c);let d=s(e,t,a,o,c,l);a.transmission>0?r.push(d):a.transparent===!0?i.push(d):n.push(d)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t){n.length>1&&n.sort(e||Ci),r.length>1&&r.sort(t||wi),i.length>1&&i.sort(t||wi)}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function Ei(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new Ti,e.set(t,[i])):n>=r.length?(i=new Ti,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function Di(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={direction:new W,color:new i};break;case`SpotLight`:n={position:new W,direction:new W,color:new i,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new W,color:new i,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new W,skyColor:new i,groundColor:new i};break;case`RectAreaLight`:n={color:new i,position:new W,halfWidth:new W,halfHeight:new W}}return e[t.id]=n,n}}}function Oi(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new r};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new r};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new r,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var ki=0;function Ai(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function ji(e){let t=new Di,n=Oi(),r={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new W);let i=new W,a=new ut,o=new ut;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0,y=0,b=0,x=0;i.sort(Ai);for(let e=0,S=i.length;e<S;e++){let S=i[e],C=S.color,w=S.intensity,T=S.distance,E=null;if(S.shadow&&S.shadow.map&&(E=S.shadow.map.texture.format===1030?S.shadow.map.texture:S.shadow.map.depthTexture||S.shadow.map.texture),S.isAmbientLight)a+=C.r*w,o+=C.g*w,s+=C.b*w;else if(S.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(S.sh.coefficients[e],w);x++}else if(S.isSunLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize.copy(e.mapSize).multiply(e.getFrameExtents()),r.sunShadow[l]=t,r.sunShadowMap[l]=E;let i=e.getViewportCount();for(let t=0;t<i;t++)r.sunShadowMatrix[u+t]=e.getMatrix(t),r.sunShadowCascade[u+t]=e._cascadeData[t];u+=i,l++}r.sun[c]=e,c++}else if(S.isDirectionalLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[d]=t,r.directionalShadowMap[d]=E,r.directionalShadowMatrix[d]=S.shadow.matrix,g++}r.directional[d]=e,d++}else if(S.isSpotLight){let e=t.get(S);e.position.setFromMatrixPosition(S.matrixWorld),e.color.copy(C).multiplyScalar(w),e.distance=T,e.coneCos=Math.cos(S.angle),e.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),e.decay=S.decay,r.spot[p]=e;let i=S.shadow;if(S.map&&(r.spotLightMap[y]=S.map,y++,i.updateMatrices(S),S.castShadow&&b++),r.spotLightMatrix[p]=i.matrix,S.castShadow){let e=n.get(S);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[p]=e,r.spotShadowMap[p]=E,v++}p++}else if(S.isRectAreaLight){let e=t.get(S);e.color.copy(C).multiplyScalar(w),e.halfWidth.set(S.width*.5,0,0),e.halfHeight.set(0,S.height*.5,0),r.rectArea[m]=e,m++}else if(S.isPointLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),e.distance=S.distance,e.decay=S.decay,S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[f]=t,r.pointShadowMap[f]=E,r.pointShadowMatrix[f]=S.shadow.matrix,_++}r.point[f]=e,f++}else if(S.isHemisphereLight){let e=t.get(S);e.skyColor.copy(S.color).multiplyScalar(w),e.groundColor.copy(S.groundColor).multiplyScalar(w),r.hemi[h]=e,h++}}m>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=q.LTC_FLOAT_1,r.rectAreaLTC2=q.LTC_FLOAT_2):(r.rectAreaLTC1=q.LTC_HALF_1,r.rectAreaLTC2=q.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let S=r.hash;(S.sunLength!==c||S.directionalLength!==d||S.pointLength!==f||S.spotLength!==p||S.rectAreaLength!==m||S.hemiLength!==h||S.numSunShadows!==l||S.numDirectionalShadows!==g||S.numPointShadows!==_||S.numSpotShadows!==v||S.numSpotMaps!==y||S.numLightProbes!==x)&&(r.sun.length=c,r.directional.length=d,r.spot.length=p,r.rectArea.length=m,r.point.length=f,r.hemi.length=h,r.sunShadow.length=l,r.sunShadowMap.length=l,r.sunShadowMatrix.length=u,r.sunShadowCascade.length=u,r.directionalShadow.length=g,r.directionalShadowMap.length=g,r.directionalShadowMatrix.length=g,r.pointShadow.length=_,r.pointShadowMap.length=_,r.pointShadowMatrix.length=_,r.spotShadow.length=v,r.spotShadowMap.length=v,r.spotLightMatrix.length=v+y-b,r.spotLightMap.length=y,r.numSpotLightShadowsWithMaps=b,r.numLightProbes=x,S.sunLength=c,S.directionalLength=d,S.pointLength=f,S.spotLength=p,S.rectAreaLength=m,S.hemiLength=h,S.numSunShadows=l,S.numDirectionalShadows=g,S.numPointShadows=_,S.numSpotShadows=v,S.numSpotMaps=y,S.numLightProbes=x,r.version=ki++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=0,f=t.matrixWorldInverse;for(let t=0,p=e.length;t<p;t++){let p=e[t];if(p.isSunLight){let e=r.sun[n];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),n++}else if(p.isDirectionalLight){let e=r.directional[s];e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),s++}else if(p.isSpotLight){let e=r.spot[l];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),l++}else if(p.isRectAreaLight){let e=r.rectArea[u];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),o.identity(),a.copy(p.matrixWorld),a.premultiply(f),o.extractRotation(a),e.halfWidth.set(p.width*.5,0,0),e.halfHeight.set(0,p.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),u++}else if(p.isPointLight){let e=r.point[c];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),c++}else if(p.isHemisphereLight){let e=r.hemi[d];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),d++}}}return{setup:s,setupView:c,state:r}}function Mi(e){let t=new ji(e),n=[],r=[],i=[];function a(e){u.camera=e,n.length=0,r.length=0,i.length=0}function o(e){e.isLightProbeGrid?i.push(e):n.push(e)}function s(e){r.push(e)}function c(){t.setup(n),i.sort((e,t)=>e.priority-t.priority||e.id-t.id)}function l(e){t.setupView(n,e)}let u={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:u,setupLights:c,setupLightsView:l,pushLight:o,pushShadow:s}}function Ni(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new Mi(e),t.set(n,[a])):r>=i.length?(a=new Mi(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var Pi=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Fi=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Ii=[new W(1,0,0),new W(-1,0,0),new W(0,1,0),new W(0,-1,0),new W(0,0,1),new W(0,0,-1)],Li=[new W(0,-1,0),new W(0,-1,0),new W(0,0,1),new W(0,0,-1),new W(0,-1,0),new W(0,-1,0)],Ri=new ut,zi=new W,Bi=new W;function Vi(e,t,n){let i=new vt,a=new r,o=new r,c=new te,l=new Ie,d=new tt,m={},h=n.maxTextureSize,g={0:1,1:0,2:2},_=new qe({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new r},radius:{value:4}},vertexShader:Pi,fragmentShader:Fi}),v=_.clone();v.defines.HORIZONTAL_PASS=1;let y=new u;y.setAttribute(`position`,new p(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let b=new St(y,_),x=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let S=this.type;this.render=function(t,n,r){if(x.enabled===!1||x.autoUpdate===!1&&x.needsUpdate===!1||t.length===0)return;this.type===2&&(k(`WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.`),this.type=1);let l=e.getRenderTarget(),u=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),p=e.state;p.setBlending(0),p.buffers.depth.getReversed()===!0?p.buffers.color.setClear(0,0,0,0):p.buffers.color.setClear(1,1,1,1),p.buffers.depth.setTest(!0),p.setScissorTest(!1);let m=S!==this.type;m&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let l=0,u=t.length;l<u;l++){let u=t[l],d=u.shadow;if(d===void 0){k(`WebGLShadowMap:`,u,`has no shadow.`);continue}if(d.autoUpdate===!1&&d.needsUpdate===!1)continue;a.copy(d.mapSize);let g=d.getFrameExtents();a.multiply(g),o.copy(d.mapSize),(a.x>h||a.y>h)&&(a.x>h&&(o.x=Math.floor(h/g.x),a.x=o.x*g.x,d.mapSize.x=o.x),a.y>h&&(o.y=Math.floor(h/g.y),a.y=o.y*g.y,d.mapSize.y=o.y));let _=e.state.buffers.depth.getReversed();if(d.camera._reversedDepth=_,d.map===null||m===!0){if(d.map!==null&&(d.map.depthTexture!==null&&(d.map.depthTexture.dispose(),d.map.depthTexture=null),d.map.dispose()),this.type===3){if(u.isPointLight){k(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}d.map=new F(a.x,a.y,{format:Et,type:Oe,minFilter:H,magFilter:H,generateMipmaps:!1}),d.map.texture.name=u.name+`.shadowMap`,d.map.depthTexture=new s(a.x,a.y,A),d.map.depthTexture.name=u.name+`.shadowMapDepth`,d.map.depthTexture.format=ue,d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=V,d.map.depthTexture.magFilter=V}else u.isPointLight?(d.map=new rn(a.x),d.map.depthTexture=new ie(a.x,f)):(d.map=new F(a.x,a.y),d.map.depthTexture=new s(a.x,a.y,f)),d.map.depthTexture.name=u.name+`.shadowMap`,d.map.depthTexture.format=ue,this.type===1?(d.map.depthTexture.compareFunction=_?518:515,d.map.depthTexture.minFilter=H,d.map.depthTexture.magFilter=H):(d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=V,d.map.depthTexture.magFilter=V);d.camera.updateProjectionMatrix()}d.map.isWebGLCubeRenderTarget!==!0&&(d.map.width!==a.x||d.map.height!==a.y)&&d.map.setSize(a.x,a.y);let v=d.map.isWebGLCubeRenderTarget?6:d.getViewportCount();u.isPointLight!==!0&&d.updateMatrices(u,r);let y=d.camera.layers.mask&4294967294?d.camera.layers:r.layers;for(let t=0;t<v;t++){let a=d.getCamera(t);if(u.isPointLight){let e=d.camera,n=d.matrix,r=u.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),zi.setFromMatrixPosition(u.matrixWorld),e.position.copy(zi),Bi.copy(e.position),Bi.add(Ii[t]),e.up.copy(Li[t]),e.lookAt(Bi),e.updateMatrixWorld(),n.makeTranslation(-zi.x,-zi.y,-zi.z),Ri.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),d._frustum.setFromProjectionMatrix(Ri,e.coordinateSystem,e.reversedDepth)}if(d.map.isWebGLCubeRenderTarget)e.setRenderTarget(d.map,t),e.clear();else{t===0&&(e.setRenderTarget(d.map),e.clear());let n=d.getViewport(t);c.set(o.x*n.x,o.y*n.y,o.x*n.z,o.y*n.w),p.viewport(c)}i=d.getFrustum(t),T(n,r,a,u,y,this.type)}d.isPointLightShadow!==!0&&this.type===3&&C(d,r),d.needsUpdate=!1}S=this.type,x.needsUpdate=!1,e.setRenderTarget(l,u,d)};function C(n,r){let i=t.update(b);_.defines.VSM_SAMPLES!==n.blurSamples&&(_.defines.VSM_SAMPLES=n.blurSamples,v.defines.VSM_SAMPLES=n.blurSamples,_.needsUpdate=!0,v.needsUpdate=!0),n.mapPass===null?n.mapPass=new F(a.x,a.y,{format:Et,type:Oe}):(n.mapPass.width!==n.map.width||n.mapPass.height!==n.map.height)&&n.mapPass.setSize(n.map.width,n.map.height),_.uniforms.shadow_pass.value=n.map.depthTexture,_.uniforms.resolution.value.set(n.map.width,n.map.height),_.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,i,_,b,null),v.uniforms.shadow_pass.value=n.mapPass.texture,v.uniforms.resolution.value.set(n.map.width,n.map.height),v.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,i,v,b,null)}function w(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?d:l,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=m[e];r===void 0&&(r={},m[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,E)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?g[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function T(n,r,a,o,s,c){if(n.visible===!1)return;if(n.layers.test(s)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&c===3)&&(!n.frustumCulled||n.intersectsFrustum(i))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let i=t.update(n),s=n.material;if(Array.isArray(s)){let t=i.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=s[u.materialIndex];if(d&&d.visible){let t=w(n,d,o,c);n.onBeforeShadow(e,n,r,a,i,t,u),e.renderBufferDirect(a,null,i,t,n,u),n.onAfterShadow(e,n,r,a,i,t,u)}}}else if(s.visible){let t=w(n,s,o,c);n.onBeforeShadow(e,n,r,a,i,t,null),e.renderBufferDirect(a,null,i,t,n,null),n.onAfterShadow(e,n,r,a,i,t,null)}}let l=n.children;for(let e=0,t=l.length;e<t;e++)T(l[e],r,a,o,s,c)}function E(e){e.target.removeEventListener(`dispose`,E);for(let t in m){let n=m[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function Hi(e,t){function n(){let t=!1,n=new te,r=null,i=new te(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?le(e.DEPTH_TEST):ue(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=Ct[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function a(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?le(e.STENCIL_TEST):ue(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let o=new n,s=new r,c=new a,l={},u=new WeakMap,d={},f={},p={},m=new WeakMap,h=[],g=null,_=!1,v=null,y=null,b=null,x=null,S=null,C=null,w=null,T=new i(0,0,0),E=0,D=!1,O=null,k=null,A=null,j=null,ee=null,M=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),N=!1,ne=0,re=e.getParameter(e.VERSION);re.indexOf(`WebGL`)===-1?re.indexOf(`OpenGL ES`)!==-1&&(ne=parseFloat(/^OpenGL ES (\d)/.exec(re)[1]),N=ne>=2):(ne=parseFloat(/^WebGL (\d)/.exec(re)[1]),N=ne>=1);let P=null,ie={},ae=e.getParameter(e.SCISSOR_BOX),oe=e.getParameter(e.VIEWPORT),F=new te().fromArray(ae),se=new te().fromArray(oe);function I(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let ce={};ce[e.TEXTURE_2D]=I(e.TEXTURE_2D,e.TEXTURE_2D,1),ce[e.TEXTURE_CUBE_MAP]=I(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),ce[e.TEXTURE_2D_ARRAY]=I(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),ce[e.TEXTURE_3D]=I(e.TEXTURE_3D,e.TEXTURE_3D,1,1),o.setClear(0,0,0,1),s.setClear(1),c.setClear(0),le(e.DEPTH_TEST),s.setFunc(3),ve(!1),ye(1),le(e.CULL_FACE),ge(0);function le(t){d[t]!==!0&&(e.enable(t),d[t]=!0)}function ue(t){d[t]!==!1&&(e.disable(t),d[t]=!1)}function de(t,n){return p[t]!==n&&(e.bindFramebuffer(t,n),p[t]=n,t===e.DRAW_FRAMEBUFFER&&(p[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(p[e.DRAW_FRAMEBUFFER]=n),!0)}function fe(t,n){let r=h,i=!1;if(t){r=m.get(n),r===void 0&&(r=[],m.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function pe(t){return g!==t&&(e.useProgram(t),g=t,!0)}let me={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};me[103]=e.MIN,me[104]=e.MAX;let he={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function ge(t,n,r,i,a,o,s,c,l,u){if(t===0)_===!0&&(ue(e.BLEND),_=!1);else if(_===!1&&(le(e.BLEND),_=!0),t!==5){if(t!==v||u!==D){if((y!==100||S!==100)&&(e.blendEquation(e.FUNC_ADD),y=100,S=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:Ht(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:Ht(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:Ht(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:Ht(`WebGLState: Invalid blending: `,t)}b=null,x=null,C=null,w=null,T.set(0,0,0),E=0,v=t,D=u}}else a||=n,o||=r,s||=i,(n!==y||a!==S)&&(e.blendEquationSeparate(me[n],me[a]),y=n,S=a),(r!==b||i!==x||o!==C||s!==w)&&(e.blendFuncSeparate(he[r],he[i],he[o],he[s]),b=r,x=i,C=o,w=s),(c.equals(T)===!1||l!==E)&&(e.blendColor(c.r,c.g,c.b,l),T.copy(c),E=l),v=t,D=!1}function _e(t,n){t.side===2?ue(e.CULL_FACE):le(e.CULL_FACE);let r=t.side===1;n&&(r=!r),ve(r),t.blending===1&&t.transparent===!1?ge(0):ge(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),s.setFunc(t.depthFunc),s.setTest(t.depthTest),s.setMask(t.depthWrite),o.setMask(t.colorWrite);let i=t.stencilWrite;c.setTest(i),i&&(c.setMask(t.stencilWriteMask),c.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),c.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),xe(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?le(e.SAMPLE_ALPHA_TO_COVERAGE):ue(e.SAMPLE_ALPHA_TO_COVERAGE)}function ve(t){O!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),O=t)}function ye(t){t===0?ue(e.CULL_FACE):(le(e.CULL_FACE),t!==k&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),k=t}function be(t){t!==A&&(N&&e.lineWidth(t),A=t)}function xe(t,n,r){t?(le(e.POLYGON_OFFSET_FILL),(j!==n||ee!==r)&&(j=n,ee=r,s.getReversed()&&(n=-n,r=-r),e.polygonOffset(n,r))):ue(e.POLYGON_OFFSET_FILL)}function Se(t){t?le(e.SCISSOR_TEST):ue(e.SCISSOR_TEST)}function L(t){t===void 0&&(t=e.TEXTURE0+M-1),P!==t&&(e.activeTexture(t),P=t)}function Ce(t,n,r){r===void 0&&(r=P===null?e.TEXTURE0+M-1:P);let i=ie[r];i===void 0&&(i={type:void 0,texture:void 0},ie[r]=i),(i.type!==t||i.texture!==n)&&(P!==r&&(e.activeTexture(r),P=r),e.bindTexture(t,n||ce[t]),i.type=t,i.texture=n)}function we(){let t=ie[P];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function Te(){try{e.compressedTexImage2D(...arguments)}catch(e){Ht(`WebGLState:`,e)}}function Ee(){try{e.compressedTexImage3D(...arguments)}catch(e){Ht(`WebGLState:`,e)}}function De(){try{e.texSubImage2D(...arguments)}catch(e){Ht(`WebGLState:`,e)}}function Oe(){try{e.texSubImage3D(...arguments)}catch(e){Ht(`WebGLState:`,e)}}function ke(){try{e.compressedTexSubImage2D(...arguments)}catch(e){Ht(`WebGLState:`,e)}}function Ae(){try{e.compressedTexSubImage3D(...arguments)}catch(e){Ht(`WebGLState:`,e)}}function je(){try{e.texStorage2D(...arguments)}catch(e){Ht(`WebGLState:`,e)}}function R(){try{e.texStorage3D(...arguments)}catch(e){Ht(`WebGLState:`,e)}}function Me(){try{e.texImage2D(...arguments)}catch(e){Ht(`WebGLState:`,e)}}function Ne(){try{e.texImage3D(...arguments)}catch(e){Ht(`WebGLState:`,e)}}function Pe(t){return f[t]===void 0?e.getParameter(t):f[t]}function Fe(t,n){f[t]!==n&&(e.pixelStorei(t,n),f[t]=n)}function z(t){F.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),F.copy(t))}function B(t){se.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),se.copy(t))}function Ie(t,n){let r=u.get(n);r===void 0&&(r=new WeakMap,u.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),e.uniformBlockBinding(n,i,i),r.set(t,i))}function Le(t,n,r){let i=u.get(n).get(t);l[i]!==r&&(e.bindBufferBase(e.UNIFORM_BUFFER,i,r),l[i]=r)}function V(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),s.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),d={},f={},P=null,ie={},p={},l={},m=new WeakMap,h=[],g=null,_=!1,v=null,y=null,b=null,x=null,S=null,C=null,w=null,T=new i(0,0,0),E=0,D=!1,O=null,k=null,A=null,j=null,ee=null,F.set(0,0,e.canvas.width,e.canvas.height),se.set(0,0,e.canvas.width,e.canvas.height),o.reset(),s.reset(),c.reset()}return{buffers:{color:o,depth:s,stencil:c},enable:le,disable:ue,bindFramebuffer:de,drawBuffers:fe,useProgram:pe,setBlending:ge,setMaterial:_e,setFlipSided:ve,setCullFace:ye,setLineWidth:be,setPolygonOffset:xe,setScissorTest:Se,activeTexture:L,bindTexture:Ce,unbindTexture:we,compressedTexImage2D:Te,compressedTexImage3D:Ee,texImage2D:Me,texImage3D:Ne,pixelStorei:Fe,getParameter:Pe,updateUBOMapping:Ie,uniformBlockBinding:Le,texStorage2D:je,texStorage3D:R,texSubImage2D:De,texSubImage3D:Oe,compressedTexSubImage2D:ke,compressedTexSubImage3D:Ae,scissor:z,viewport:B,reset:V}}function Ui(e,t,n,i,a,o,s){let c=t.has(`WEBGL_multisampled_render_to_texture`)?t.get(`WEBGL_multisampled_render_to_texture`):null,l=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),u=new r,d=new WeakMap,f=new Set,p,m=new WeakMap,h=new Set,g=new FinalizationRegistry(e=>h.delete(e)),_=!1;try{_=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function v(e,t){return _?new OffscreenCanvas(e,t):le(`canvas`)}function y(e,t,n){let r=1,i=Me(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);p===void 0&&(p=v(n,a));let o=t?v(n,a):p;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),k(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&k(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function b(e){return e.generateMipmaps}function x(t){e.generateMipmap(t)}function S(t){return t.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:t.isWebGL3DRenderTarget?e.TEXTURE_3D:t.isWebGLArrayRenderTarget||t.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function C(n,r,i,a,o,s=!1){if(n!==null){if(e[n]!==void 0)return e[n];k(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+n+`'`)}let c;a&&(c=t.get(`EXT_texture_norm16`),c||k(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let l=r;if(r===e.RED&&(i===e.FLOAT&&(l=e.R32F),i===e.HALF_FLOAT&&(l=e.R16F),i===e.UNSIGNED_BYTE&&(l=e.R8),i===e.UNSIGNED_SHORT&&c&&(l=c.R16_EXT),i===e.SHORT&&c&&(l=c.R16_SNORM_EXT)),r===e.RED_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.R8UI),i===e.UNSIGNED_SHORT&&(l=e.R16UI),i===e.UNSIGNED_INT&&(l=e.R32UI),i===e.BYTE&&(l=e.R8I),i===e.SHORT&&(l=e.R16I),i===e.INT&&(l=e.R32I)),r===e.RG&&(i===e.FLOAT&&(l=e.RG32F),i===e.HALF_FLOAT&&(l=e.RG16F),i===e.UNSIGNED_BYTE&&(l=e.RG8),i===e.UNSIGNED_SHORT&&c&&(l=c.RG16_EXT),i===e.SHORT&&c&&(l=c.RG16_SNORM_EXT)),r===e.RG_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RG8UI),i===e.UNSIGNED_SHORT&&(l=e.RG16UI),i===e.UNSIGNED_INT&&(l=e.RG32UI),i===e.BYTE&&(l=e.RG8I),i===e.SHORT&&(l=e.RG16I),i===e.INT&&(l=e.RG32I)),r===e.RGB_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGB8UI),i===e.UNSIGNED_SHORT&&(l=e.RGB16UI),i===e.UNSIGNED_INT&&(l=e.RGB32UI),i===e.BYTE&&(l=e.RGB8I),i===e.SHORT&&(l=e.RGB16I),i===e.INT&&(l=e.RGB32I)),r===e.RGBA_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGBA8UI),i===e.UNSIGNED_SHORT&&(l=e.RGBA16UI),i===e.UNSIGNED_INT&&(l=e.RGBA32UI),i===e.BYTE&&(l=e.RGBA8I),i===e.SHORT&&(l=e.RGBA16I),i===e.INT&&(l=e.RGBA32I)),r===e.RGB&&(i===e.UNSIGNED_SHORT&&c&&(l=c.RGB16_EXT),i===e.SHORT&&c&&(l=c.RGB16_SNORM_EXT),i===e.UNSIGNED_INT_5_9_9_9_REV&&(l=e.RGB9_E5),i===e.UNSIGNED_INT_10F_11F_11F_REV&&(l=e.R11F_G11F_B10F)),r===e.RGBA){let t=s?Ye:Qe.getTransfer(o);i===e.FLOAT&&(l=e.RGBA32F),i===e.HALF_FLOAT&&(l=e.RGBA16F),i===e.UNSIGNED_BYTE&&(l=t===`srgb`?e.SRGB8_ALPHA8:e.RGBA8),i===e.UNSIGNED_SHORT&&c&&(l=c.RGBA16_EXT),i===e.SHORT&&c&&(l=c.RGBA16_SNORM_EXT),i===e.UNSIGNED_SHORT_4_4_4_4&&(l=e.RGBA4),i===e.UNSIGNED_SHORT_5_5_5_1&&(l=e.RGB5_A1)}return(l===e.R16F||l===e.R32F||l===e.RG16F||l===e.RG32F||l===e.RGBA16F||l===e.RGBA32F)&&t.get(`EXT_color_buffer_float`),l}function w(t,n){let r;return t?n===null||n===1014||n===1020?r=e.DEPTH24_STENCIL8:n===1015?r=e.DEPTH32F_STENCIL8:n===1012&&(r=e.DEPTH24_STENCIL8,k(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):n===null||n===1014||n===1020?r=e.DEPTH_COMPONENT24:n===1015?r=e.DEPTH_COMPONENT32F:n===1012&&(r=e.DEPTH_COMPONENT16),r}function T(e,t){return b(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function E(e){let t=new WeakRef(e);i.get(e).__ref=t,h.add(t),g.register(e,t,t)}function D(e){let t=i.get(e).__ref;t!==void 0&&(h.delete(t),g.unregister(t))}function O(e){j(e.target)}function A(e){ee(e.target)}function j(e){e.removeEventListener(`dispose`,O),D(e),N(e),e.isVideoTexture&&d.delete(e),e.isHTMLTexture&&f.delete(e)}function ee(e){e.removeEventListener(`dispose`,A),D(e),ne(e)}function M(){for(let e of h){let t=e.deref();t!==void 0&&(t.isRenderTarget===!0?ee(t):j(t))}h.clear(),f.clear()}function N(e){let t=i.get(e);if(t.__webglInit===void 0)return;let n=e.source,r=m.get(n);if(r){let i=r[t.__cacheKey];i.usedTimes--,i.usedTimes===0&&te(e),Object.keys(r).length===0&&m.delete(n)}i.remove(e)}function te(t){let n=i.get(t);e.deleteTexture(n.__webglTexture);let r=t.source,a=m.get(r);delete a[n.__cacheKey],s.memory.textures--}function ne(t){let n=i.get(t);n.__depthDisposeCallback&&n.__depthDisposeCallback();let r=t.depthTexture;if(r&&r.renderTarget===t&&j(r),t.isWebGLCubeRenderTarget)for(let t=0;t<6;t++){if(Array.isArray(n.__webglFramebuffer[t]))for(let r=0;r<n.__webglFramebuffer[t].length;r++)e.deleteFramebuffer(n.__webglFramebuffer[t][r]);else e.deleteFramebuffer(n.__webglFramebuffer[t]);n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer[t])}else{if(Array.isArray(n.__webglFramebuffer))for(let t=0;t<n.__webglFramebuffer.length;t++)e.deleteFramebuffer(n.__webglFramebuffer[t]);else e.deleteFramebuffer(n.__webglFramebuffer);if(n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer),n.__webglMultisampledFramebuffer&&e.deleteFramebuffer(n.__webglMultisampledFramebuffer),n.__webglColorRenderbuffer)for(let t=0;t<n.__webglColorRenderbuffer.length;t++)n.__webglColorRenderbuffer[t]&&e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);n.__webglDepthRenderbuffer&&e.deleteRenderbuffer(n.__webglDepthRenderbuffer)}let a=t.textures;for(let t=0,n=a.length;t<n;t++){let n=i.get(a[t]);n.__webglTexture&&(e.deleteTexture(n.__webglTexture),s.memory.textures--),i.remove(a[t])}i.remove(t)}let re=0;function P(){re=0}function ie(){return re}function ae(e){re=e}function oe(){let e=re;return e>=a.maxTextures&&k(`WebGLTextures: Trying to use `+(e+1)+` texture units while this GPU supports only `+a.maxTextures),re+=1,e}function F(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.mipmapsAutoUpdate),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function se(t,r){let a=i.get(t);if(t.isVideoTexture&&je(t),t.isRenderTargetTexture===!1&&t.isExternalTexture!==!0&&t.version>0&&a.__version!==t.version){let e=t.image;if(e===null)k(`WebGLRenderer: Texture marked for update but no image data found.`);else if(e.complete===!1)k(`WebGLRenderer: Texture marked for update but image is incomplete`);else{ve(a,t,r);return}}else t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,a.__webglTexture,e.TEXTURE0+r)}function I(t,r){let a=i.get(t);t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version?ve(a,t,r):(t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null),n.bindTexture(e.TEXTURE_2D_ARRAY,a.__webglTexture,e.TEXTURE0+r))}function ce(t,r){let a=i.get(t);t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version?ve(a,t,r):n.bindTexture(e.TEXTURE_3D,a.__webglTexture,e.TEXTURE0+r)}function ue(t,r){let a=i.get(t);t.version>0&&a.__version!==t.version?ye(a,t,r):n.bindTexture(e.TEXTURE_CUBE_MAP,a.__webglTexture,e.TEXTURE0+r)}let de={[dt]:e.REPEAT,[et]:e.CLAMP_TO_EDGE,[Ot]:e.MIRRORED_REPEAT},fe={[V]:e.NEAREST,[pt]:e.NEAREST_MIPMAP_NEAREST,[ze]:e.NEAREST_MIPMAP_LINEAR,[H]:e.LINEAR,[st]:e.LINEAR_MIPMAP_NEAREST,[Tt]:e.LINEAR_MIPMAP_LINEAR},pe={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function me(n,r){if(r.type===1015&&t.has(`OES_texture_float_linear`)===!1&&(r.magFilter===1006||r.magFilter===1007||r.magFilter===1005||r.magFilter===1008||r.minFilter===1006||r.minFilter===1007||r.minFilter===1005||r.minFilter===1008)&&k(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),e.texParameteri(n,e.TEXTURE_WRAP_S,de[r.wrapS]),e.texParameteri(n,e.TEXTURE_WRAP_T,de[r.wrapT]),(n===e.TEXTURE_3D||n===e.TEXTURE_2D_ARRAY)&&e.texParameteri(n,e.TEXTURE_WRAP_R,de[r.wrapR]),e.texParameteri(n,e.TEXTURE_MAG_FILTER,fe[r.magFilter]),e.texParameteri(n,e.TEXTURE_MIN_FILTER,fe[r.minFilter]),r.compareFunction&&(e.texParameteri(n,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(n,e.TEXTURE_COMPARE_FUNC,pe[r.compareFunction])),t.has(`EXT_texture_filter_anisotropic`)===!0){if(r.magFilter===1003||r.minFilter!==1005&&r.minFilter!==1008||r.type===1015&&t.has(`OES_texture_float_linear`)===!1)return;if(r.anisotropy>1||i.get(r).__currentAnisotropy){let o=t.get(`EXT_texture_filter_anisotropic`);e.texParameterf(n,o.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(r.anisotropy,a.getMaxAnisotropy())),i.get(r).__currentAnisotropy=r.anisotropy}}}function he(t,n){let r=!1;t.__webglInit===void 0&&(t.__webglInit=!0,n.addEventListener(`dispose`,O),E(n));let i=n.source,a=m.get(i);a===void 0&&(a={},m.set(i,a));let o=F(n);if(o!==t.__cacheKey){a[o]===void 0&&(a[o]={texture:e.createTexture(),usedTimes:0},s.memory.textures++,r=!0),a[o].usedTimes++;let i=a[t.__cacheKey];i!==void 0&&(a[t.__cacheKey].usedTimes--,i.usedTimes===0&&te(n)),t.__cacheKey=o,t.__webglTexture=a[o].texture}return r}function ge(e,t,n){return Math.floor(Math.floor(e/n)/t)}function _e(t,r,i,a){let o=t.updateRanges;if(o.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,r.width,r.height,i,a,r.data);else{o.sort((e,t)=>e.start-t.start);let s=0;for(let e=1;e<o.length;e++){let t=o[s],n=o[e],i=t.start+t.count,a=ge(n.start,r.width,4),c=ge(t.start,r.width,4);n.start<=i+1&&a===c&&ge(n.start+n.count-1,r.width,4)===a?t.count=Math.max(t.count,n.start+n.count-t.start):(++s,o[s]=n)}o.length=s+1;let c=n.getParameter(e.UNPACK_ROW_LENGTH),l=n.getParameter(e.UNPACK_SKIP_PIXELS),u=n.getParameter(e.UNPACK_SKIP_ROWS);n.pixelStorei(e.UNPACK_ROW_LENGTH,r.width);for(let t=0,s=o.length;t<s;t++){let s=o[t],c=Math.floor(s.start/4),l=Math.ceil(s.count/4),u=c%r.width,d=Math.floor(c/r.width),f=l;n.pixelStorei(e.UNPACK_SKIP_PIXELS,u),n.pixelStorei(e.UNPACK_SKIP_ROWS,d),n.texSubImage2D(e.TEXTURE_2D,0,u,d,f,1,i,a,r.data)}t.clearUpdateRanges(),n.pixelStorei(e.UNPACK_ROW_LENGTH,c),n.pixelStorei(e.UNPACK_SKIP_PIXELS,l),n.pixelStorei(e.UNPACK_SKIP_ROWS,u)}}function ve(t,r,s){let c=e.TEXTURE_2D;(r.isDataArrayTexture||r.isCompressedArrayTexture)&&(c=e.TEXTURE_2D_ARRAY),r.isData3DTexture&&(c=e.TEXTURE_3D);let l=he(t,r),u=r.source;n.bindTexture(c,t.__webglTexture,e.TEXTURE0+s);let d=i.get(u);if(u.version!==d.__version||l===!0){if(n.activeTexture(e.TEXTURE0+s),!(typeof ImageBitmap<`u`&&r.image instanceof ImageBitmap)){let t=Qe.getPrimaries(Qe.workingColorSpace),i=r.colorSpace===``?null:Qe.getPrimaries(r.colorSpace),a=r.colorSpace===``||t===i?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,r.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,r.premultiplyAlpha),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,a)}n.pixelStorei(e.UNPACK_ALIGNMENT,r.unpackAlignment);let t=y(r.image,!1,a.maxTextureSize);t=R(r,t);let i=o.convert(r.format,r.colorSpace),p=o.convert(r.type),m=C(r.internalFormat,i,p,r.normalized,r.colorSpace,r.isVideoTexture);me(c,r);let h,g=r.mipmaps,_=r.isVideoTexture!==!0,v=d.__version===void 0||l===!0,S=u.dataReady,E=T(r,t);if(r.isDepthTexture)m=w(r.format===Ut,r.type),v&&(_?n.texStorage2D(e.TEXTURE_2D,1,m,t.width,t.height):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,i,p,null));else if(r.isDataTexture){if(g.length>0){_&&v&&n.texStorage2D(e.TEXTURE_2D,E,m,g[0].width,g[0].height);for(let t=0,r=g.length;t<r;t++)h=g[t],_?S&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,i,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,i,p,h.data);r.generateMipmaps=!1}else _?(v&&n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height),S&&_e(r,t,i,p)):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,i,p,t.data)}else if(r.isCompressedTexture){if(r.isCompressedArrayTexture){_&&v&&n.texStorage3D(e.TEXTURE_2D_ARRAY,E,m,g[0].width,g[0].height,t.depth);for(let a=0,o=g.length;a<o;a++)if(h=g[a],r.format!==1023){if(i!==null){if(_){if(S){if(r.layerUpdates.size>0){let t=be(h.width,h.height,r.format,r.type);for(let o of r.layerUpdates){let r=h.data.subarray(o*t/h.data.BYTES_PER_ELEMENT,(o+1)*t/h.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,a,0,0,o,h.width,h.height,1,i,r)}}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,a,0,0,0,h.width,h.height,t.depth,i,h.data)}}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,a,m,h.width,h.height,t.depth,0,h.data,0,0)}else k(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`)}else _?S&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,a,0,0,0,h.width,h.height,t.depth,i,p,h.data):n.texImage3D(e.TEXTURE_2D_ARRAY,a,m,h.width,h.height,t.depth,0,i,p,h.data);r.layerUpdates.size>0&&r.clearLayerUpdates()}else{_&&v&&n.texStorage2D(e.TEXTURE_2D,E,m,g[0].width,g[0].height);for(let t=0,a=g.length;t<a;t++)h=g[t],r.format===1023?_?S&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,i,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,i,p,h.data):i===null?k(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):_?S&&n.compressedTexSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,i,h.data):n.compressedTexImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,h.data)}}else if(r.isDataArrayTexture){if(_){if(v&&n.texStorage3D(e.TEXTURE_2D_ARRAY,E,m,t.width,t.height,t.depth),S){if(r.layerUpdates.size>0){let a=be(t.width,t.height,r.format,r.type);for(let o of r.layerUpdates){let r=t.data.subarray(o*a/t.data.BYTES_PER_ELEMENT,(o+1)*a/t.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,o,t.width,t.height,1,i,p,r)}r.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,t.width,t.height,t.depth,i,p,t.data)}}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,m,t.width,t.height,t.depth,0,i,p,t.data)}else if(r.isData3DTexture)_?(v&&n.texStorage3D(e.TEXTURE_3D,E,m,t.width,t.height,t.depth),S&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,t.width,t.height,t.depth,i,p,t.data)):n.texImage3D(e.TEXTURE_3D,0,m,t.width,t.height,t.depth,0,i,p,t.data);else if(r.isFramebufferTexture){if(v){if(_)n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height);else{let r=t.width,a=t.height;for(let t=0;t<E;t++)n.texImage2D(e.TEXTURE_2D,t,m,r,a,0,i,p,null),r>>=1,a>>=1}}}else if(r.isHTMLTexture){if(`texElementImage2D`in e){let n=e.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),t.parentNode!==n){n.appendChild(t),f.add(r),n.onpaint=e=>{let t=e.changedElements;for(let e of f)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(e.texElementImage2D.length===3)e.texElementImage2D(e.TEXTURE_2D,e.RGBA8,t);else{let n=e.RGBA,r=e.RGBA,i=e.UNSIGNED_BYTE;e.texElementImage2D(e.TEXTURE_2D,0,n,r,i,t)}e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}}else if(g.length>0){if(_&&v){let t=Me(g[0]);n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height)}for(let t=0,r=g.length;t<r;t++)h=g[t],_?S&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,i,p,h):n.texImage2D(e.TEXTURE_2D,t,m,i,p,h);r.generateMipmaps=!1}else if(_){if(v){let r=Me(t);n.texStorage2D(e.TEXTURE_2D,E,m,r.width,r.height)}S&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,i,p,t)}else n.texImage2D(e.TEXTURE_2D,0,m,i,p,t);b(r)&&r.mipmapsAutoUpdate===!0&&x(c),d.__version=u.version,r.onUpdate&&r.onUpdate(r)}t.__version=r.version}function ye(t,r,s){if(r.image.length!==6)return;let c=he(t,r),l=r.source;n.bindTexture(e.TEXTURE_CUBE_MAP,t.__webglTexture,e.TEXTURE0+s);let u=i.get(l);if(l.version!==u.__version||c===!0){n.activeTexture(e.TEXTURE0+s);let t=Qe.getPrimaries(Qe.workingColorSpace),i=r.colorSpace===``?null:Qe.getPrimaries(r.colorSpace),d=r.colorSpace===``||t===i?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,r.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,r.premultiplyAlpha),n.pixelStorei(e.UNPACK_ALIGNMENT,r.unpackAlignment),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,d);let f=r.isCompressedTexture||r.image[0].isCompressedTexture,p=r.image[0]&&r.image[0].isDataTexture,m=[];for(let e=0;e<6;e++)!f&&!p?m[e]=y(r.image[e],!0,a.maxCubemapSize):m[e]=p?r.image[e].image:r.image[e],m[e]=R(r,m[e]);let h=m[0],g=o.convert(r.format,r.colorSpace),_=o.convert(r.type),v=C(r.internalFormat,g,_,r.normalized,r.colorSpace),S=r.isVideoTexture!==!0,E=u.__version===void 0||c===!0,D=l.dataReady,O=T(r,h);me(e.TEXTURE_CUBE_MAP,r);let A;if(r.isDepthTexture){if(v=w(r.format===Ut,r.type),E){if(S)n.texStorage2D(e.TEXTURE_CUBE_MAP,1,v,h.width,h.height);else for(let t=0;t<6;t++)n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,h.width,h.height,0,g,_,null)}}else if(f){S&&E&&n.texStorage2D(e.TEXTURE_CUBE_MAP,O,v,h.width,h.height);for(let t=0;t<6;t++){A=m[t].mipmaps;for(let i=0;i<A.length;i++){let a=A[i];r.format===1023?S?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,i,0,0,a.width,a.height,g,_,a.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,i,v,a.width,a.height,0,g,_,a.data):g===null?k(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):S?D&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,i,0,0,a.width,a.height,g,a.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,i,v,a.width,a.height,0,a.data)}}}else{if(A=r.mipmaps,S&&E){A.length>0&&O++;let t=Me(m[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,O,v,t.width,t.height)}for(let t=0;t<6;t++)if(p){S?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,m[t].width,m[t].height,g,_,m[t].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,m[t].width,m[t].height,0,g,_,m[t].data);for(let r=0;r<A.length;r++){let i=A[r].image[t].image;S?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,v,i.width,i.height,0,g,_,i.data)}}else{S?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,g,_,m[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,g,_,m[t]);for(let r=0;r<A.length;r++){let i=A[r];S?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,g,_,i.image[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,v,g,_,i.image[t])}}}b(r)&&r.mipmapsAutoUpdate===!0&&x(e.TEXTURE_CUBE_MAP),u.__version=l.version,r.onUpdate&&r.onUpdate(r)}t.__version=r.version}function xe(t,r,a,s,l,u){let d=o.convert(a.format,a.colorSpace),f=o.convert(a.type),p=C(a.internalFormat,d,f,a.normalized,a.colorSpace),m=i.get(r),h=i.get(a);if(h.__renderTarget=r,!m.__hasExternalTextures){let t=Math.max(1,r.width>>u),i=Math.max(1,r.height>>u);l===e.TEXTURE_3D||l===e.TEXTURE_2D_ARRAY?n.texImage3D(l,u,p,t,i,r.depth,0,d,f,null):n.texImage2D(l,u,p,t,i,0,d,f,null)}n.bindFramebuffer(e.FRAMEBUFFER,t),Ae(r)?c.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,s,l,h.__webglTexture,0,ke(r)):(l===e.TEXTURE_2D||l>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&l<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,s,l,h.__webglTexture,u),n.bindFramebuffer(e.FRAMEBUFFER,null)}function Se(t,n,r){if(e.bindRenderbuffer(e.RENDERBUFFER,t),n.depthBuffer){let i=n.depthTexture,a=i&&i.isDepthTexture?i.type:null,o=w(n.stencilBuffer,a),s=n.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;Ae(n)?c.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,ke(n),o,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,ke(n),o,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,o,n.width,n.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,s,e.RENDERBUFFER,t)}else{let t=n.textures;for(let i=0;i<t.length;i++){let a=t[i],s=o.convert(a.format,a.colorSpace),l=o.convert(a.type),u=C(a.internalFormat,s,l,a.normalized,a.colorSpace);Ae(n)?c.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,ke(n),u,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,ke(n),u,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,u,n.width,n.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function L(t,r,a){let o=r.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(e.FRAMEBUFFER,t),!(r.depthTexture&&r.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let s=i.get(r.depthTexture);s.__renderTarget=r;let l=o?r.depthTexture.image[0]:r.depthTexture.image;s.__webglTexture&&l.width===r.width&&l.height===r.height||(l.width=r.width,l.height=r.height,r.depthTexture.needsUpdate=!0),o?ue(r.depthTexture,0):se(r.depthTexture,0);let u=s.__webglTexture,d=ke(r),f=o?e.TEXTURE_CUBE_MAP_POSITIVE_X+a:e.TEXTURE_2D,p=r.depthTexture.format===1027?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(r.depthTexture.format===1026)Ae(r)?c.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else if(r.depthTexture.format===1027)Ae(r)?c.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function Ce(t){let r=i.get(t),a=t.isWebGLCubeRenderTarget===!0;if(r.__boundDepthTexture!==t.depthTexture){let e=t.depthTexture;if(r.__depthDisposeCallback&&r.__depthDisposeCallback(),e){let t=()=>{delete r.__boundDepthTexture,delete r.__depthDisposeCallback,e.removeEventListener(`dispose`,t)};e.addEventListener(`dispose`,t),r.__depthDisposeCallback=t}r.__boundDepthTexture=e}if(t.depthTexture&&!r.__autoAllocateDepthBuffer){if(a)for(let e=0;e<6;e++)L(r.__webglFramebuffer[e],t,e);else t.texture.mipmaps.length>0?L(r.__webglFramebuffer[0],t,0):L(r.__webglFramebuffer,t,0)}else if(a){r.__webglDepthbuffer=[];for(let i=0;i<6;i++)if(n.bindFramebuffer(e.FRAMEBUFFER,r.__webglFramebuffer[i]),r.__webglDepthbuffer[i]===void 0)r.__webglDepthbuffer[i]=e.createRenderbuffer(),Se(r.__webglDepthbuffer[i],t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,a=r.__webglDepthbuffer[i];e.bindRenderbuffer(e.RENDERBUFFER,a),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,a)}}else if(t.texture.mipmaps.length>0?n.bindFramebuffer(e.FRAMEBUFFER,r.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,r.__webglFramebuffer),r.__webglDepthbuffer===void 0)r.__webglDepthbuffer=e.createRenderbuffer(),Se(r.__webglDepthbuffer,t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,i=r.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,i),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,i)}n.bindFramebuffer(e.FRAMEBUFFER,null)}function we(t,n,r){let a=i.get(t);n!==void 0&&xe(a.__webglFramebuffer,t,t.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),r!==void 0&&Ce(t)}function Te(t){let r=t.texture,a=i.get(t),c=i.get(r);t.addEventListener(`dispose`,A),E(t);let l=t.textures,u=t.isWebGLCubeRenderTarget===!0,d=l.length>1;if(d||(c.__webglTexture===void 0&&(c.__webglTexture=e.createTexture()),c.__version=r.version,s.memory.textures++),u){a.__webglFramebuffer=[];for(let t=0;t<6;t++)if(r.mipmaps.length>0){a.__webglFramebuffer[t]=[];for(let n=0;n<r.mipmaps.length;n++)a.__webglFramebuffer[t][n]=e.createFramebuffer()}else a.__webglFramebuffer[t]=e.createFramebuffer()}else{if(r.mipmaps.length>0){a.__webglFramebuffer=[];for(let t=0;t<r.mipmaps.length;t++)a.__webglFramebuffer[t]=e.createFramebuffer()}else a.__webglFramebuffer=e.createFramebuffer();if(d)for(let t=0,n=l.length;t<n;t++){let n=i.get(l[t]);n.__webglTexture===void 0&&(n.__webglTexture=e.createTexture(),s.memory.textures++)}if(t.samples>0&&Ae(t)===!1){a.__webglMultisampledFramebuffer=e.createFramebuffer(),a.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,a.__webglMultisampledFramebuffer);for(let n=0;n<l.length;n++){let r=l[n];a.__webglColorRenderbuffer[n]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,a.__webglColorRenderbuffer[n]);let i=o.convert(r.format,r.colorSpace),s=o.convert(r.type),c=C(r.internalFormat,i,s,r.normalized,r.colorSpace,t.isXRRenderTarget===!0),u=ke(t);e.renderbufferStorageMultisample(e.RENDERBUFFER,u,c,t.width,t.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+n,e.RENDERBUFFER,a.__webglColorRenderbuffer[n])}e.bindRenderbuffer(e.RENDERBUFFER,null),t.depthBuffer&&(a.__webglDepthRenderbuffer=e.createRenderbuffer(),Se(a.__webglDepthRenderbuffer,t,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(u){n.bindTexture(e.TEXTURE_CUBE_MAP,c.__webglTexture),me(e.TEXTURE_CUBE_MAP,r);for(let n=0;n<6;n++)if(r.mipmaps.length>0)for(let i=0;i<r.mipmaps.length;i++)xe(a.__webglFramebuffer[n][i],t,r,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,i);else xe(a.__webglFramebuffer[n],t,r,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0);b(r)?x(e.TEXTURE_CUBE_MAP):r.mipmaps.length>0&&e.texParameteri(e.TEXTURE_CUBE_MAP,e.TEXTURE_MAX_LEVEL,r.mipmaps.length-1),n.unbindTexture()}else if(d){for(let r=0,o=l.length;r<o;r++){let o=l[r],s=i.get(o),c=e.TEXTURE_2D;(t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(c=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(c,s.__webglTexture),me(c,o),xe(a.__webglFramebuffer,t,o,e.COLOR_ATTACHMENT0+r,c,0),b(o)&&x(c)}n.unbindTexture()}else{let i=e.TEXTURE_2D;if((t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(i=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(i,c.__webglTexture),me(i,r),r.mipmaps.length>0)for(let n=0;n<r.mipmaps.length;n++)xe(a.__webglFramebuffer[n],t,r,e.COLOR_ATTACHMENT0,i,n);else xe(a.__webglFramebuffer,t,r,e.COLOR_ATTACHMENT0,i,0);b(r)?x(i):r.mipmaps.length>0&&e.texParameteri(i,e.TEXTURE_MAX_LEVEL,r.mipmaps.length-1),n.unbindTexture()}t.depthBuffer&&Ce(t)}function Ee(e){let t=e.textures;for(let r=0,a=t.length;r<a;r++){let a=t[r];if(b(a)&&a.mipmapsAutoUpdate===!0){let t=S(e),r=i.get(a).__webglTexture;n.bindTexture(t,r),x(t),n.unbindTexture()}}}let De=[];function Oe(t){if(t.samples>0){if(Ae(t)===!1){let r=t.textures,a=t.width,o=t.height,s=e.COLOR_BUFFER_BIT,c=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,u=i.get(t),d=r.length>1;if(d)for(let t=0;t<r.length;t++)n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,u.__webglMultisampledFramebuffer),t.texture.mipmaps.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer);for(let n=0;n<r.length;n++){if(t.resolveDepthBuffer&&(t.depthBuffer&&(s|=e.DEPTH_BUFFER_BIT),t.stencilBuffer&&t.resolveStencilBuffer&&(s|=e.STENCIL_BUFFER_BIT)),d){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,u.__webglColorRenderbuffer[n]);let t=i.get(r[n]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0)}e.blitFramebuffer(0,0,a,o,0,0,a,o,s,e.NEAREST),l===!0&&(De.length=0,De.push(e.COLOR_ATTACHMENT0+n),t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&De.push(c),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,De))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),d)for(let t=0;t<r.length;t++){n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,u.__webglColorRenderbuffer[t]);let a=i.get(r[t]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,a,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglMultisampledFramebuffer)}else if(t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&l){let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[n])}}}function ke(e){return Math.min(a.maxSamples,e.samples)}function Ae(e){let n=i.get(e);return e.samples>0&&t.has(`WEBGL_multisampled_render_to_texture`)===!0&&n.__useRenderToTexture!==!1}function je(e){let t=s.render.frame;d.get(e)!==t&&(d.set(e,t),e.update())}function R(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(Qe.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&k(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):Ht(`WebGLTextures: Unsupported texture color space:`,n)),t}function Me(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(u.width=e.naturalWidth||e.width,u.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(u.width=e.displayWidth,u.height=e.displayHeight):(u.width=e.width,u.height=e.height),u}this.allocateTextureUnit=oe,this.resetTextureUnits=P,this.getTextureUnits=ie,this.setTextureUnits=ae,this.setTexture2D=se,this.setTexture2DArray=I,this.setTexture3D=ce,this.setTextureCube=ue,this.rebindTextures=we,this.setupRenderTarget=Te,this.updateRenderTargetMipmap=Ee,this.updateMultisampleRenderTarget=Oe,this.setupDepthRenderbuffer=Ce,this.setupFrameBufferTexture=xe,this.useMultisampledRTT=Ae,this.dispose=M}function Wi(e,t){function n(n,r=``){let i,a=Qe.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var Gi=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Ki=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,qi=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new Ce(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new qe({vertexShader:Gi,fragmentShader:Ki,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new St(new Ae(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Ji=class extends ve{constructor(e,t){super();let n=this,i=null,a=1,o=null,c=`local-floor`,l=1,u=null,d=null,p=null,m=null,g=null,_=null,v=typeof XRWebGLBinding<`u`,y=new qi,b={},x=t.getContextAttributes(),S=null,C=null,w=[],T=[],E=new r,D=null,O=null,A=new Ke;A.viewport=new te;let j=new Ke;j.viewport=new te;let ee=[A,j],M=new It,N=null,ne=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=w[e];return t===void 0&&(t=new h,w[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=w[e];return t===void 0&&(t=new h,w[e]=t),t.getGripSpace()},this.getHand=function(e){let t=w[e];return t===void 0&&(t=new h,w[e]=t),t.getHandSpace()};function re(e){let t=T.indexOf(e.inputSource);if(t===-1)return;let n=w[t];n!==void 0&&(n.update(e.inputSource,e.frame,u||o),n.dispatchEvent({type:e.type,data:e.inputSource}))}function P(){i.removeEventListener(`select`,re),i.removeEventListener(`selectstart`,re),i.removeEventListener(`selectend`,re),i.removeEventListener(`squeeze`,re),i.removeEventListener(`squeezestart`,re),i.removeEventListener(`squeezeend`,re),i.removeEventListener(`end`,P),i.removeEventListener(`inputsourceschange`,ie);for(let e=0;e<w.length;e++){let t=T[e];t!==null&&(T[e]=null,w[e].disconnect(t))}N=null,ne=null,y.reset();for(let e in b)delete b[e];if(e.setRenderTarget(S),g=null,m=null,p=null,i=null,C=null,ce.stop(),n.isPresenting=!1,e.setPixelRatio(D),e.setSize(E.width,E.height,!1),O!==null){let e=O.camera;e.fov=O.fov,e.zoom=O.zoom,e.updateProjectionMatrix(),O=null}n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){a=e,n.isPresenting===!0&&k(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){c=e,n.isPresenting===!0&&k(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return u||o},this.setReferenceSpace=function(e){u=e},this.getBaseLayer=function(){return m===null?g:m},this.getBinding=function(){return p===null&&v&&(p=new XRWebGLBinding(i,t)),p},this.getFrame=function(){return _},this.getSession=function(){return i},this.setSession=async function(r){if(i=r,i!==null){if(S=e.getRenderTarget(),i.addEventListener(`select`,re),i.addEventListener(`selectstart`,re),i.addEventListener(`selectend`,re),i.addEventListener(`squeeze`,re),i.addEventListener(`squeezestart`,re),i.addEventListener(`squeezeend`,re),i.addEventListener(`end`,P),i.addEventListener(`inputsourceschange`,ie),x.xrCompatible!==!0&&await t.makeXRCompatible(),D=e.getPixelRatio(),e.getSize(E),v&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,r=null,o=null;x.depth&&(o=x.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=x.stencil?Ut:ue,r=x.stencil?Ft:f);let c={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:a};p=this.getBinding(),m=p.createProjectionLayer(c),i.updateRenderState({layers:[m]}),e.setPixelRatio(1),e.setSize(m.textureWidth,m.textureHeight,!1),C=new F(m.textureWidth,m.textureHeight,{format:Pt,type:de,depthTexture:new s(m.textureWidth,m.textureHeight,r,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:x.stencil,colorSpace:e.outputColorSpace,samples:x.antialias?4:0,resolveDepthBuffer:m.ignoreDepthValues===!1,resolveStencilBuffer:m.ignoreDepthValues===!1,storeMultisampledDepthBuffer:m.ignoreDepthValues===!1,storeMultisampledStencilBuffer:m.ignoreDepthValues===!1})}else{let n={antialias:x.antialias,alpha:!0,depth:x.depth,stencil:x.stencil,framebufferScaleFactor:a};g=new XRWebGLLayer(i,t,n),i.updateRenderState({baseLayer:g}),e.setPixelRatio(1),e.setSize(g.framebufferWidth,g.framebufferHeight,!1),C=new F(g.framebufferWidth,g.framebufferHeight,{format:Pt,type:de,colorSpace:e.outputColorSpace,stencilBuffer:x.stencil,resolveDepthBuffer:g.ignoreDepthValues===!1,resolveStencilBuffer:g.ignoreDepthValues===!1,storeMultisampledDepthBuffer:g.ignoreDepthValues===!1,storeMultisampledStencilBuffer:g.ignoreDepthValues===!1})}C.isXRRenderTarget=!0,this.setFoveation(l),u=null,o=await i.requestReferenceSpace(c),ce.setContext(i),ce.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return y.getDepthTexture()};function ie(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=T.indexOf(n);r>=0&&(T[r]=null,w[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=T.indexOf(n);if(r===-1){for(let e=0;e<w.length;e++)if(e>=T.length){T.push(n),r=e;break}else if(T[e]===null){T[e]=n,r=e;break}if(r===-1)break}let i=w[r];i&&i.connect(n)}}function ae(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(i===null)return;let t=e.near,n=e.far;y.texture!==null&&(y.depthNear>0&&(t=y.depthNear),y.depthFar>0&&(n=y.depthFar)),M.near=j.near=A.near=t,M.far=j.far=A.far=n,(N!==M.near||ne!==M.far)&&(i.updateRenderState({depthNear:M.near,depthFar:M.far}),N=M.near,ne=M.far),M.layers.mask=e.layers.mask|6,A.layers.mask=M.layers.mask&-5,j.layers.mask=M.layers.mask&-3;let r=e.parent,a=M.cameras;ae(M,r);for(let e=0;e<a.length;e++)ae(a[e],r);M.projectionMatrix.copy(A.projectionMatrix),M.projectionMatrixInverse.copy(A.projectionMatrixInverse),O===null&&e.isPerspectiveCamera&&(O={camera:e,fov:e.fov,zoom:e.zoom}),oe(e,M,r)};function oe(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=Fe*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return M},this.getFoveation=function(){if(m!==null||g!==null)return l},this.setFoveation=function(e){l=e,m!==null&&(m.fixedFoveation=e),g!==null&&g.fixedFoveation!==void 0&&(g.fixedFoveation=e)},this.hasDepthSensing=function(){return y.texture!==null},this.getDepthSensingMesh=function(){return y.getMesh(M)},this.getCameraTexture=function(e){return b[e]};let se=null;function I(t,r){if(d=r.getViewerPose(u||o),_=r,d!==null){let t=d.views;g!==null&&(e.setRenderTargetFramebuffer(C,g.framebuffer),e.setRenderTarget(C));let r=!1;t.length!==M.cameras.length&&(M.cameras.length=0,r=!0);for(let n=0;n<t.length;n++){let i=t[n],a=null;if(g!==null)a=g.getViewport(i);else{let t=p.getViewSubImage(m,i);a=t.viewport,n===0&&(e.setRenderTargetTextures(C,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(C))}let o=ee[n];o===void 0&&(o=new Ke,o.layers.enable(n),o.viewport=new te,ee[n]=o),o.matrix.fromArray(i.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(i.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(M.matrix.copy(o.matrix),M.matrix.decompose(M.position,M.quaternion,M.scale)),r===!0&&M.cameras.push(o)}let a=i.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&i.depthUsage==`gpu-optimized`&&v){p=n.getBinding();let e=p.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&y.init(e,i.renderState)}if(a&&a.includes(`camera-access`)&&v){e.state.unbindTexture(),p=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=b[n];e||(e=new Ce,b[n]=e);let t=p.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<w.length;e++){let t=T[e],n=w[e];t!==null&&n!==void 0&&n.update(t,r,u||o)}se&&se(t,r),r.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:r}),_=null}let ce=new Kt;ce.setAnimationLoop(I),this.setAnimationLoop=function(e){se=e},this.dispose=function(){}}},Yi=new ut,Xi=new R;Xi.set(-1,0,0,0,1,0,0,0,1);function Zi(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,x(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(Yi.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(Xi),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.diffuseRoughness>0&&(e.diffuseRoughness.value=t.diffuseRoughness,t.diffuseRoughnessMap&&(e.diffuseRoughnessMap.value=t.diffuseRoughnessMap,n(t.diffuseRoughnessMap,e.diffuseRoughnessMapTransform))),t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.retroreflectivity>0&&(e.retroreflectivity.value=t.retroreflectivity),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessMinimum,e.iridescenceThicknessMaximum.value=t.iridescenceThicknessMaximum,t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function Qi(e,t,n,r){let i={},a={};function o(e,t){let n=t.program;r.uniformBlockBinding(e,n,i[e.id])}function s(e,n){let o=i[e.id];o===void 0&&(m(e),o=c(e),i[e.id]=o,e.addEventListener(`dispose`,g));let s=n.program;r.updateUBOMapping(e,s);let u=t.render.frame;a[e.id]!==u&&(l(e),a[e.id]=u)}function c(t){let n=e.createBuffer(),r=t.__size,i=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,n),e.bufferData(e.UNIFORM_BUFFER,r,i),e.bindBuffer(e.UNIFORM_BUFFER,null),n}function l(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)u(t[n],e,n,a);else u(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function u(t,n,r,i){if(f(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=h(i,!0);d(i,t.__data,e),e+=a.storage/Float32Array.BYTES_PER_ELEMENT}}else d(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function d(e,t,n){typeof e==`number`||typeof e==`boolean`?t[n]=e:e.isMatrix3?(t[n]=e.elements[0],t[n+1]=e.elements[1],t[n+2]=e.elements[2],t[n+3]=0,t[n+4]=e.elements[3],t[n+5]=e.elements[4],t[n+6]=e.elements[5],t[n+7]=0,t[n+8]=e.elements[6],t[n+9]=e.elements[7],t[n+10]=e.elements[8],t[n+11]=0):ArrayBuffer.isView(e)?t.set(e.subarray(0,t.length-n),n):e.toArray(t,n)}function f(e,t,n,r){let i=e.value,a=t+`_`+n;if(Array.isArray(i)){r[a]===void 0&&(r[a]=[]);let e=r[a],t=!1;for(let n=0;n<i.length;n++)p(i[n],e,n)===!0&&(t=!0);return t}return p(i,r,a)}function p(e,t,n){if(t[n]===void 0)return t[n]=typeof e==`number`||typeof e==`boolean`?e:ArrayBuffer.isView(e)?e.slice():e.clone(),!0;{let r=t[n];if(typeof e==`number`||typeof e==`boolean`){if(r!==e)return t[n]=e,!0}else if(ArrayBuffer.isView(e))return!0;else if(r.equals(e)===!1)return r.copy(e),!0}return!1}function m(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let i=0,a=r.length;i<a;i++){let a=r[i],o=Array.isArray(a.value)?a.value:[a.value],s=Array.isArray(t[e])||Array.isArray(a.value),c=n;for(let e=0,t=o.length;e<t;e++){let t=o[e],r=h(t,s),i=n%16,a=i%r.boundary,l=i+a;n+=a,l!==0&&16-l<r.storage&&(n+=16-l),e===0&&(c=n),n+=r.storage}a.__data=new(a.type===`int`?Int32Array:a.type===`uint`?Uint32Array:Float32Array)((n-c)/Float32Array.BYTES_PER_ELEMENT),a.__offset=c}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function h(e,t){let n={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(n.boundary=4,n.storage=4):e.isVector2?(n.boundary=8,n.storage=8):e.isVector3||e.isColor?(n.boundary=16,n.storage=12):e.isVector4?(n.boundary=16,n.storage=16):e.isMatrix3?(n.boundary=16,n.storage=48):e.isMatrix4?(n.boundary=16,n.storage=64):e.isTexture?k(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(n.boundary=16,n.storage=e.byteLength):k(`WebGLRenderer: Unsupported uniform value type.`,e),t===!0&&(n.boundary=16,n.storage=Math.ceil(n.storage/16)*16),n}function g(t){let n=t.target;n.removeEventListener(`dispose`,g),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function _(){for(let t in i)e.deleteBuffer(i[t]);i={},a={}}return{bind:o,update:s,dispose:_}}var $i=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),ea=null;function ta(){return ea===null&&(ea=new M($i,16,16,Et,Oe),ea.name=`DFG_LUT`,ea.minFilter=H,ea.magFilter=H,ea.wrapS=et,ea.wrapT=et,ea.generateMipmaps=!1,ea.needsUpdate=!0),ea}var na=class{constructor(e={}){let{canvas:t=ee(),context:n=null,depth:r=!0,stencil:a=!1,alpha:o=!1,antialias:s=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:u=!1,powerPreference:d=`default`,failIfMajorPerformanceCaveat:p=!1,reversedDepthBuffer:m=!1,outputBufferType:h=de}=e;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);g=n.getContextAttributes().alpha}else g=o;let _=h,y=new Set([me,ct,Me]),b=new Set([de,f,$e,Ft,l,ae]),x=new Uint32Array(4),S=new Int32Array(4),C={textures:[],min:[],max:[],resolution:[]},w=null,T=null,E=[],O=[],A=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let j=this,M=!1,N=null,ne=null,re=null,ie=null;this._outputColorSpace=Be;let oe=0,se=0,I=null,ce=-1,le=null,ue=new te,fe=new te,pe=null,he=new i(0),ge=0,ve=t.width,ye=t.height,be=1,xe=null,Se=null,L=new te(0,0,ve,ye),Ce=new te(0,0,ve,ye),we=!1,Te=new vt,Ee=new D,De=!1,ke=!1,Ae=new ut,je=new W,R=new te,Ne={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Pe=!1;function Fe(){return I===null?be:1}let z=n;function B(e,n){return t.getContext(e,n)}let Ie,Le,V,Re,H,U,ze,Ve,He,Ue,We,Ge,Ke,qe,Je,Ye,Xe,Ze,et,tt,nt,rt,it;try{let e={alpha:!0,depth:r,stencil:a,antialias:s,premultipliedAlpha:c,preserveDrawingBuffer:u,powerPreference:d,failIfMajorPerformanceCaveat:p};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r187`),t.addEventListener(`webglcontextlost`,st,!1),t.addEventListener(`webglcontextrestored`,lt,!1),t.addEventListener(`webglcontextcreationerror`,dt,!1),z===null){let t=`webgl2`;if(z=B(t,e),z===null)throw B(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}at()}catch(e){throw t.removeEventListener(`webglcontextlost`,st,!1),t.removeEventListener(`webglcontextrestored`,lt,!1),t.removeEventListener(`webglcontextcreationerror`,dt,!1),Ht(`WebGLRenderer: `+e.message),e}function at(){Ie=new Sn(z),Ie.init(),nt=new Wi(z,Ie),Le=new tn(z,Ie,e,nt),V=new Hi(z,Ie),Le.reversedDepthBuffer&&m&&V.buffers.depth.setReversed(!0),ne=z.createFramebuffer(),re=z.createFramebuffer(),ie=z.createFramebuffer(),Re=new Tn(z),H=new Si,U=new Ui(z,Ie,V,H,Le,nt,Re),ze=new xn(j),Ve=new qt(z),rt=new $t(z,Ve),He=new Cn(z,Ve,Re,rt),Ue=new Dn(z,He,Ve,rt,Re),Ze=new En(z,Le,U),Je=new nn(H),We=new xi(j,ze,Ie,Le,rt,Je),Ge=new Zi(j,H),Ke=new Ei,qe=new Ni(Ie),Xe=new Qt(j,ze,V,Ue,g,c),Ye=new Vi(j,Ue,Le),it=new Qi(z,Re,Le,V),et=new en(z,Ie,Re),tt=new wn(z,Ie,Re),Re.programs=We.programs,j.capabilities=Le,j.extensions=Ie,j.properties=H,j.renderLists=Ke,j.shadowMap=Ye,j.state=V,j.info=Re}_!==1009&&(A=new kn(_,t.width,t.height,s,r,a));let ot=new Ji(j,z);this.xr=ot,this.getContext=function(){return z},this.getContextAttributes=function(){return z.getContextAttributes()},this.forceContextLoss=function(){let e=Ie.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=Ie.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return be},this.setPixelRatio=function(e){e!==void 0&&(be=e,this.setSize(ve,ye,!1))},this.getSize=function(e){return e.set(ve,ye)},this.setSize=function(e,n,r=!0){ot.isPresenting?k(`WebGLRenderer: Can't change size while VR device is presenting.`):(ve=e,ye=n,t.width=Math.floor(e*be),t.height=Math.floor(n*be),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),A!==null&&A.setSize(t.width,t.height),this.setViewport(0,0,e,n))},this.getDrawingBufferSize=function(e){return e.set(ve*be,ye*be).floor()},this.setDrawingBufferSize=function(e,n,r){ve=e,ye=n,be=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(_===1009)Ht(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);else{if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){k(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}A.setEffects(e||[])}},this.getCurrentViewport=function(e){return e.copy(ue)},this.getViewport=function(e){return e.copy(L)},this.setViewport=function(e,t,n,r){e.isVector4?L.set(e.x,e.y,e.z,e.w):L.set(e,t,n,r),V.viewport(ue.copy(L).multiplyScalar(Fe()).round())},this.getScissor=function(e){return e.copy(Ce)},this.setScissor=function(e,t,n,r){e.isVector4?Ce.set(e.x,e.y,e.z,e.w):Ce.set(e,t,n,r),V.scissor(fe.copy(Ce).multiplyScalar(Fe()).round())},this.getScissorTest=function(){return we},this.setScissorTest=function(e){V.setScissorTest(we=e)},this.setOpaqueSort=function(e){xe=e},this.setTransparentSort=function(e){Se=e},this.getClearColor=function(e){return e.copy(Xe.getClearColor())},this.setClearColor=function(){Xe.setClearColor(...arguments)},this.getClearAlpha=function(){return Xe.getClearAlpha()},this.setClearAlpha=function(){Xe.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(I!==null){let t=I.texture.format;e=y.has(t)}if(e){let e=I.texture.type,t=b.has(e),n=Xe.getClearColor(),r=Xe.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(x[0]=i,x[1]=a,x[2]=o,x[3]=r,z.clearBufferuiv(z.COLOR,0,x)):(S[0]=i,S[1]=a,S[2]=o,S[3]=r,z.clearBufferiv(z.COLOR,0,S))}else r|=z.COLOR_BUFFER_BIT}t&&(r|=z.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=z.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&z.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),N=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,st,!1),t.removeEventListener(`webglcontextrestored`,lt,!1),t.removeEventListener(`webglcontextcreationerror`,dt,!1),Xe.dispose(),Ke.dispose(),qe.dispose(),U.dispose(),H.dispose(),ze.dispose(),Ue.dispose(),He.dispose(),rt.dispose(),it.dispose(),We.dispose(),ot.dispose(),ot.removeEventListener(`sessionstart`,yt),ot.removeEventListener(`sessionend`,bt),xt.stop()};function st(e){e.preventDefault(),_e(`WebGLRenderer: Context Lost.`),M=!0}function lt(){_e(`WebGLRenderer: Context Restored.`),M=!1;let e=Re.autoReset,t=Ye.enabled,n=Ye.autoUpdate,r=Ye.needsUpdate,i=Ye.type;at(),Re.autoReset=e,Ye.enabled=t,Ye.autoUpdate=n,Ye.needsUpdate=r,Ye.type=i}function dt(e){Ht(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function ft(e){let t=e.target;t.removeEventListener(`dispose`,ft),pt(t)}function pt(e){mt(e),H.remove(e)}function mt(e){let t=H.get(e).programs;t!==void 0&&(t.forEach(function(e){We.releaseProgram(e)}),e.isShaderMaterial&&We.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=Ne);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=Mt(e,t,n,r,i);V.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=He.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;rt.setup(i,r,s,n,c);let h,g=et;if(c!==null&&(h=Ve.get(c),g=tt,g.setIndex(h)),i.isMesh)r.wireframe===!0?(V.setLineWidth(r.wireframeLinewidth*Fe()),g.setMode(z.LINES)):g.setMode(z.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),V.setLineWidth(e*Fe()),i.isLineSegments?g.setMode(z.LINES):i.isLineLoop?g.setMode(z.LINE_LOOP):g.setMode(z.LINE_STRIP)}else i.isPoints?g.setMode(z.POINTS):i.isSprite&&g.setMode(z.TRIANGLES);if(i.isBatchedMesh){if(Ie.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?Ve.get(c).bytesPerElement:1,o=H.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(z,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function ht(e,t,n,r){N!==null&&e.isNodeMaterial&&N.setObject(r,e),De===!0&&Je.setState(e,n,!1),e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,G(e,t,r),e.side=0,e.needsUpdate=!0,G(e,t,r),e.side=2):G(e,t,r)}this.compile=function(e,t,n=null){n===null&&(n=e),N!==null&&N.renderStart(e,t,n),T=qe.get(n),T.init(t),O.push(T),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(T.pushLight(e),e.castShadow&&T.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(T.pushLight(e),e.castShadow&&T.pushShadow(e))}),T.setupLights(),N!==null&&N.updateLights(T.state.lightsArray),ke=this.localClippingEnabled,De=Je.init(this.clippingPlanes,ke),De===!0&&Je.setGlobalState(this.clippingPlanes,t),N!==null&&Ye.render(T.state.shadowsArray,n,t);let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let i=e.material;if(i){if(Array.isArray(i))for(let a=0;a<i.length;a++){let o=i[a];ht(o,n,t,e),r.add(o)}else ht(i,n,t,e),r.add(i)}}),T=O.pop(),N!==null&&N.renderEnd(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){r.forEach(function(e){let t=H.get(e).currentProgram;(t===void 0||t.isReady())&&r.delete(e)}),r.size===0?t(e):setTimeout(n,10)}Ie.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let gt=null;function _t(e){gt&&gt(e)}function yt(){xt.stop()}function bt(){xt.start()}let xt=new Kt;xt.setAnimationLoop(_t),typeof self<`u`&&xt.setContext(self),this.setAnimationLoop=function(e){gt=e,ot.setAnimationLoop(e),e===null?xt.stop():xt.start()},ot.addEventListener(`sessionstart`,yt),ot.addEventListener(`sessionend`,bt),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){Ht(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(M===!0)return;N!==null&&N.renderStart(e,t);let n=ot.enabled===!0&&ot.isPresenting===!0,r=A!==null&&(I===null||n)&&A.begin(j,I);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),ot.enabled===!0&&ot.isPresenting===!0&&(A===null||A.isCompositing()===!1)&&(ot.cameraAutoUpdate===!0&&ot.updateCamera(t),t=ot.getCamera()),e.isScene===!0&&e.onBeforeRender(j,e,t,I),T=qe.get(e,O.length),T.init(t),T.state.textureUnits=U.getTextureUnits(),O.push(T),Ae.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),t.isArrayCamera?Ee.setFromArrayCamera(t):Te.setFromProjectionMatrix(Ae,P,t.reversedDepth),ke=this.localClippingEnabled,De=Je.init(this.clippingPlanes,ke),w=Ke.get(e,E.length),w.init(),E.push(w),this.info.render.frame++,ot.enabled===!0&&ot.isPresenting===!0){let e=j.xr.getDepthSensingMesh();e!==null&&St(e,t,-1/0,j.sortObjects)}St(e,t,0,j.sortObjects),w.finish(),N!==null&&N.updateLights(T.state.lightsArray),j.sortObjects===!0&&w.sort(xe,Se),Pe=ot.enabled===!1||ot.isPresenting===!1||ot.hasDepthSensing()===!1,Pe&&Xe.addToRenderList(w,e),this.info.autoReset===!0&&this.info.reset(),De===!0&&Je.beginShadows();let i=T.state.shadowsArray;if(Ye.render(i,e,t),De===!0&&Je.endShadows(),(r&&A.hasRenderPass())===!1){let n=w.opaque,r=w.transmissive;if(T.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];wt(n,r,e,a)}Pe&&Xe.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];Ct(w,e,n,n.viewport)}}else r.length>0&&wt(n,r,e,t),Pe&&Xe.render(e),Ct(w,e,t)}I!==null&&se===0&&(U.updateMultisampleRenderTarget(I),U.updateRenderTargetMipmap(I)),r&&A.end(j),e.isScene===!0&&e.onAfterRender(j,e,t),rt.resetDefaultState(),ce=-1,le=null,O.pop(),O.length>0?(T=O[O.length-1],U.setTextureUnits(T.state.textureUnits),De===!0&&Je.setGlobalState(j.clippingPlanes,T.state.camera)):T=null,E.pop(),w=E.length>0?E[E.length-1]:null,N!==null&&N.renderEnd()};function St(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLight)T.pushLight(e),e.castShadow&&T.pushShadow(e);else if(e.isSprite){let i=t.isArrayCamera?Ee:Te;if(!e.frustumCulled||e.intersectsFrustum(i)){r&&R.setFromMatrixPosition(e.matrixWorld).applyMatrix4(Ae);let i=Ue.update(e),a=e.material;a.visible&&w.push(e,i,a,n,R.z,null,t)}}else if(e.isMesh||e.isLine||e.isPoints){let i=t.isArrayCamera?Ee:Te;if(!e.frustumCulled||e.intersectsFrustum(i)){let i=Ue.update(e),a=e.material;if(r&&(e.boundingSphere===void 0?(i.boundingSphere===null&&i.computeBoundingSphere(),R.copy(i.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),R.copy(e.boundingSphere.center)),R.applyMatrix4(e.matrixWorld).applyMatrix4(Ae)),Array.isArray(a)){let r=i.groups;for(let o=0,s=r.length;o<s;o++){let s=r[o],c=a[s.materialIndex];c&&c.visible&&w.push(e,i,c,n,R.z,s,t)}}else a.visible&&w.push(e,i,a,n,R.z,null,t)}}}let i=e.children;for(let e=0,a=i.length;e<a;e++)St(i[e],t,n,r)}function Ct(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;T.setupLightsView(n),De===!0&&Je.setGlobalState(j.clippingPlanes,n),r&&V.viewport(ue.copy(r)),i.length>0&&Et(i,t,n),a.length>0&&Et(a,t,n),o.length>0&&Et(o,t,n),V.buffers.depth.setTest(!0),V.buffers.depth.setMask(!0),V.buffers.color.setMask(!0),V.setPolygonOffset(!1)}function wt(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(T.state.transmissionRenderTarget[r.id]===void 0){let e=Ie.has(`EXT_color_buffer_half_float`)||Ie.has(`EXT_color_buffer_float`);T.state.transmissionRenderTarget[r.id]=new F(1,1,{generateMipmaps:!0,type:e?Oe:de,minFilter:Tt,samples:Math.max(4,Le.samples),stencilBuffer:a,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Qe.workingColorSpace})}let i=T.state.transmissionRenderTarget[r.id],o=r.viewport||ue;i.setSize(o.z*j.transmissionResolutionScale,o.w*j.transmissionResolutionScale);let s=j.getRenderTarget(),c=j.getActiveCubeFace(),l=j.getActiveMipmapLevel();j.setRenderTarget(i),j.getClearColor(he),ge=j.getClearAlpha(),ge<1&&j.setClearColor(16777215,.5),j.clear(),Pe&&Xe.render(n);let u=j.toneMapping;j.toneMapping=0;let d=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),T.setupLightsView(r),De===!0&&Je.setGlobalState(j.clippingPlanes,r),Et(e,n,r),U.updateMultisampleRenderTarget(i),U.updateRenderTargetMipmap(i),Ie.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,Dt(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(U.updateMultisampleRenderTarget(i),U.updateRenderTargetMipmap(i))}j.setRenderTarget(s,c,l),j.setClearColor(he,ge),d!==void 0&&(r.viewport=d),j.toneMapping=u}function Et(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&Dt(o,t,n,s,l,c)}}function Dt(e,t,n,r,i,a){N!==null&&i.isNodeMaterial&&N.setObject(e,i),e.onBeforeRender(j,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(j,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,j.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,j.renderBufferDirect(n,t,r,i,e,a),i.side=2):j.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(j,t,n,r,i,a)}function Ot(e){let t=0;for(let n of e)n.texture!==null&&t++;return t}function G(e,t,n){t.isScene!==!0&&(t=Ne);let r=H.get(e),i=T.state.lights,a=T.state.shadowsArray,o=i.state.version,s=We.getParameters(e,i.state,a,t,n,T.state.lightProbeGridArray),c=We.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=ze.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,ft),l=new Map,r.programs=l,r.programVariants=new Map);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return jt(e,s),d}else s.uniforms=We.getUniforms(e),N!==null&&e.isNodeMaterial&&N.build(e,n,s),e.onBeforeCompile(s,j),d=We.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=Je.uniform),jt(e,s),r.needsLights=Pt(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.sunLights.value=i.state.sun,f.sunLightShadows.value=i.state.sunShadow,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.sunShadowMatrix.value=i.state.sunShadowMatrix,f.sunShadowCascade.value=i.state.sunShadowCascade,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.numLightProbeGrids=Ot(T.state.lightProbeGridArray),r.currentProgram=d,r.uniformsList=null,d}function kt(e,t,n,r,i){let a=H.get(e),o=a.currentProgram.id+`,`+r+`,`+i,s=a.programVariants.get(o);return s===void 0?(s=G(e,t,n),a.programVariants.set(o,s)):(a.currentProgram=s,a.uniformsList=null,a.outputColorSpace=r,a.toneMapping=i),s}function At(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=Rr.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function jt(e,t){let n=H.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function Mt(e,t,n,r,i){t.isScene!==!0&&(t=Ne),U.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=I===null?j.outputColorSpace:I.isXRRenderTarget===!0?I.texture.colorSpace:Qe.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=ze.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(I===null||I.isXRRenderTarget===!0)&&(h=j.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=H.get(r),y=T.state.lights;if(De===!0&&(ke===!0||e!==le)){let t=e===le&&r.id===ce;Je.setState(r,e,t)}let b=!1,x=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version||i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i._colorsTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i._colorsTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?b=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==Je.numPlanes||v.numIntersection!==Je.numIntersection)?b=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.morphTargetsCount===_&&v.numLightProbeGrids===Ot(T.state.lightProbeGridArray)?(v.outputColorSpace!==s||v.toneMapping!==h)&&(x=!0):b=!0:b=!0:(b=!0,v.__version=r.version);let S=v.currentProgram;(b===!0||x===!0)&&(S=x===!0?kt(r,t,i,s,h):G(r,t,i),N&&r.isNodeMaterial&&N.onUpdateProgram(r,S,v));let w=!1,E=!1,D=!1,O=S.getUniforms(),k=v.uniforms;if(V.useProgram(S.program)&&(w=!0,E=!0,D=!0),r.id!==ce&&(ce=r.id,E=!0),w||le!==e){V.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),O.setValue(z,`projectionMatrix`,e.projectionMatrix),O.setValue(z,`viewMatrix`,e.matrixWorldInverse);let t=O.map.cameraPosition;t!==void 0&&t.setValue(z,je.setFromMatrixPosition(e.matrixWorld)),Le.logarithmicDepthBuffer&&O.setValue(z,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&O.setValue(z,`isOrthographic`,e.isOrthographicCamera===!0),le!==e&&(le=e,E=!0,D=!0)}if(v.needsLights&&(y.state.sunShadowMap.length>0&&O.setValue(z,`sunShadowMap`,y.state.sunShadowMap,U),y.state.directionalShadowMap.length>0&&O.setValue(z,`directionalShadowMap`,y.state.directionalShadowMap,U),y.state.spotShadowMap.length>0&&O.setValue(z,`spotShadowMap`,y.state.spotShadowMap,U),y.state.pointShadowMap.length>0&&O.setValue(z,`pointShadowMap`,y.state.pointShadowMap,U)),i.isSkinnedMesh){O.setOptional(z,i,`bindMatrix`),O.setOptional(z,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),O.setValue(z,`boneTexture`,e.boneTexture,U))}i.isBatchedMesh&&(O.setOptional(z,i,`batchingTexture`),O.setValue(z,`batchingTexture`,i._matricesTexture,U),O.setOptional(z,i,`batchingIdTexture`),O.setValue(z,`batchingIdTexture`,i._indirectTexture,U),O.setOptional(z,i,`batchingColorTexture`),i._colorsTexture!==null&&O.setValue(z,`batchingColorTexture`,i._colorsTexture,U));let A=n.morphAttributes;if((A.position!==void 0||A.normal!==void 0||A.color!==void 0)&&Ze.update(i,n,S),(E||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,O.setValue(z,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(k.envMapIntensity.value=t.environmentIntensity),k.dfgLUT!==void 0&&(k.dfgLUT.value=ta()),E){if(O.setValue(z,`toneMappingExposure`,j.toneMappingExposure),v.needsLights&&Nt(k,D),a&&r.fog===!0&&Ge.refreshFogUniforms(k,a),Ge.refreshMaterialUniforms(k,r,be,ye,T.state.transmissionRenderTarget[e.id]),v.needsLights&&v.numLightProbeGrids>0){let e=C,t=0;for(let n of T.state.lightProbeGridArray)n.texture!==null&&(e.textures[t]=n.texture,e.min[t]=n.boundingBox.min,e.max[t]=n.boundingBox.max,e.resolution[t]=n.resolution,t++);for(let n in e)e[n].length=t;k.probesSH.value=e.textures,k.probesMin.value=e.min,k.probesMax.value=e.max,k.probesResolution.value=e.resolution}Rr.upload(z,At(v),k,U)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(Rr.upload(z,At(v),k,U),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&O.setValue(z,`center`,i.center),O.setValue(z,`modelViewMatrix`,i.modelViewMatrix),O.setValue(z,`normalMatrix`,i.normalMatrix),O.setValue(z,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];it.update(n,S),it.bind(n,S)}}return S}function Nt(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.sunLights.needsUpdate=t,e.sunLightShadows.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function Pt(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return oe},this.getActiveMipmapLevel=function(){return se},this.getRenderTarget=function(){return I},this.setRenderTargetTextures=function(e,t,n){let r=H.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),H.get(e.texture).__webglTexture=t,H.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=H.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){I=e,oe=t,se=n;let r=null,i=!1,a=!1;if(e){let o=H.get(e);if(o.__useDefaultFramebuffer!==void 0){V.bindFramebuffer(z.FRAMEBUFFER,o.__webglFramebuffer),ue.copy(e.viewport),fe.copy(e.scissor),pe=e.scissorTest,V.viewport(ue),V.scissor(fe),V.setScissorTest(pe),ce=-1;return}if(o.__webglFramebuffer===void 0)U.setupRenderTarget(e);else if(o.__hasExternalTextures)U.rebindTextures(e,H.get(e.texture).__webglTexture,H.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&H.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);U.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=H.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&U.useMultisampledRTT(e)===!1?H.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,ue.copy(e.viewport),fe.copy(e.scissor),pe=e.scissorTest}else ue.copy(L).multiplyScalar(be).floor(),fe.copy(Ce).multiplyScalar(be).floor(),pe=we;if(n!==0&&(r=ne),V.bindFramebuffer(z.FRAMEBUFFER,r)&&V.drawBuffers(e,r),V.viewport(ue),V.scissor(fe),V.setScissorTest(pe),i){let r=H.get(e.texture);z.framebufferTexture2D(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=H.get(e.textures[t]);z.framebufferTextureLayer(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=H.get(e.texture);z.framebufferTexture2D(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_2D,t.__webglTexture,n)}ce=-1};function It(e){let t=H.get(e);return(t.__readFormat!==e.format||t.__readType!==e.type)&&(t.__readFormat=e.format,t.__readType=e.type,t.__formatReadable=Le.textureFormatReadable(e.format),t.__typeReadable=Le.textureTypeReadable(e.type)),t}this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){Ht(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=H.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o],Array.isArray(c)&&(c=c[0])),c){V.bindFramebuffer(z.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;e.textures.length>1&&z.readBuffer(z.COLOR_ATTACHMENT0+s);let u=It(o);if(u.__formatReadable===!1){Ht(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(u.__typeReadable===!1){Ht(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&z.readPixels(t,n,r,i,nt.convert(c),nt.convert(l),a)}finally{let e=I===null?null:H.get(I).__webglFramebuffer;V.bindFramebuffer(z.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=H.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o],Array.isArray(c)&&(c=c[0])),c){if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){V.bindFramebuffer(z.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;e.textures.length>1&&z.readBuffer(z.COLOR_ATTACHMENT0+s);let d=It(o);if(d.__formatReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(d.__typeReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let f=z.createBuffer();z.bindBuffer(z.PIXEL_PACK_BUFFER,f),z.bufferData(z.PIXEL_PACK_BUFFER,a.byteLength,z.STREAM_READ),z.readPixels(t,n,r,i,nt.convert(l),nt.convert(u),0),z.bindBuffer(z.PIXEL_PACK_BUFFER,null);let p=I===null?null:H.get(I).__webglFramebuffer;V.bindFramebuffer(z.FRAMEBUFFER,p);let m=z.fenceSync(z.SYNC_GPU_COMMANDS_COMPLETE,0);return z.flush(),await v(z,m,4),z.bindBuffer(z.PIXEL_PACK_BUFFER,f),z.getBufferSubData(z.PIXEL_PACK_BUFFER,0,a),z.bindBuffer(z.PIXEL_PACK_BUFFER,null),z.deleteBuffer(f),z.deleteSync(m),a}throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)}},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;U.setTexture2D(e,0),z.copyTexSubImage2D(z.TEXTURE_2D,n,0,0,o,s,i,a),V.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=nt.convert(t.format),_=nt.convert(t.type),v;t.isData3DTexture?(U.setTexture3D(t,0),v=z.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(U.setTexture2DArray(t,0),v=z.TEXTURE_2D_ARRAY):(U.setTexture2D(t,0),v=z.TEXTURE_2D),V.activeTexture(z.TEXTURE0),V.pixelStorei(z.UNPACK_FLIP_Y_WEBGL,t.flipY),V.pixelStorei(z.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),V.pixelStorei(z.UNPACK_ALIGNMENT,t.unpackAlignment);let y=V.getParameter(z.UNPACK_ROW_LENGTH),b=V.getParameter(z.UNPACK_IMAGE_HEIGHT),x=V.getParameter(z.UNPACK_SKIP_PIXELS),S=V.getParameter(z.UNPACK_SKIP_ROWS),C=V.getParameter(z.UNPACK_SKIP_IMAGES);V.pixelStorei(z.UNPACK_ROW_LENGTH,h.width),V.pixelStorei(z.UNPACK_IMAGE_HEIGHT,h.height),V.pixelStorei(z.UNPACK_SKIP_PIXELS,l),V.pixelStorei(z.UNPACK_SKIP_ROWS,u),V.pixelStorei(z.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=H.get(e),r=H.get(t),h=H.get(n.__renderTarget),g=H.get(r.__renderTarget);V.bindFramebuffer(z.READ_FRAMEBUFFER,h.__webglFramebuffer),V.bindFramebuffer(z.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(z.framebufferTextureLayer(z.READ_FRAMEBUFFER,z.COLOR_ATTACHMENT0,H.get(e).__webglTexture,i,d+n),z.framebufferTextureLayer(z.DRAW_FRAMEBUFFER,z.COLOR_ATTACHMENT0,H.get(t).__webglTexture,a,m+n)),z.blitFramebuffer(l,u,l+o,u+s,f,p,f+o,p+s,z.DEPTH_BUFFER_BIT,z.NEAREST);V.bindFramebuffer(z.READ_FRAMEBUFFER,null),V.bindFramebuffer(z.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||H.has(e)){let n=H.get(e),r=H.get(t);V.bindFramebuffer(z.READ_FRAMEBUFFER,re),V.bindFramebuffer(z.DRAW_FRAMEBUFFER,ie);for(let e=0;e<c;e++)w?z.framebufferTextureLayer(z.READ_FRAMEBUFFER,z.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):z.framebufferTexture2D(z.READ_FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_2D,n.__webglTexture,i),T?z.framebufferTextureLayer(z.DRAW_FRAMEBUFFER,z.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):z.framebufferTexture2D(z.DRAW_FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_2D,r.__webglTexture,a),i===0?T?z.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):z.copyTexSubImage2D(v,a,f,p,l,u,o,s):z.blitFramebuffer(l,u,l+o,u+s,f,p,f+o,p+s,z.COLOR_BUFFER_BIT,z.NEAREST);V.bindFramebuffer(z.READ_FRAMEBUFFER,null),V.bindFramebuffer(z.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?z.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?z.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):z.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?z.texSubImage2D(z.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?z.compressedTexSubImage2D(z.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):z.texSubImage2D(z.TEXTURE_2D,a,f,p,o,s,g,_,h);V.pixelStorei(z.UNPACK_ROW_LENGTH,y),V.pixelStorei(z.UNPACK_IMAGE_HEIGHT,b),V.pixelStorei(z.UNPACK_SKIP_PIXELS,x),V.pixelStorei(z.UNPACK_SKIP_ROWS,S),V.pixelStorei(z.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps===!0&&t.mipmapsAutoUpdate===!0&&z.generateMipmap(v),V.unbindTexture()},this.initRenderTarget=function(e){H.get(e).__webglFramebuffer===void 0&&U.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?U.setTextureCube(e,0):e.isData3DTexture?U.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?U.setTexture2DArray(e,0):U.setTexture2D(e,0),V.unbindTexture()},this.resetState=function(){oe=0,se=0,I=null,V.reset(),rt.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return P}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=Qe._getDrawingBufferColorSpace(e),t.unpackColorSpace=Qe._getUnpackColorSpace()}};function ra(){return{uTime:{value:0},uBend:{value:0},uBendCenter:{value:new W},uSkyLift:{value:0},uAlive:{value:0},uHillReveal:{value:0},uFogColor:{value:new i(.034,.06,.17)},uFogRange:{value:new r(170,fe.hillRadius-8)},uMoonDir:{value:new W(.4,.5,-.76).normalize()},uMoonCol:{value:new i(.34,.5,.95)},uAmbSky:{value:new i(.06,.12,.36)},uAmbGround:{value:new i(.05,.045,.11)},uWarmCol:{value:new i(1,.56,.16)},uHeadPos:{value:new W(0,-999,0)},uHeadDir:{value:new W(0,0,-1)},uHeadPower:{value:0},uStrokeDist:{value:7},tCanvas:{value:null},uPixel:{value:.001},uGlow:{value:1}}}var ia=`
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash31(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float vnoise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(hash31(i), hash31(i + vec3(1.0, 0.0, 0.0)), f.x);
  float b = mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x);
  float c = mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x);
  float d = mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), f.x);
  return mix(mix(a, b, f.y), mix(c, d, f.y), f.z);
}
`,aa=`
struct Dab {
  float id;      // random 0..1 per stroke
  float id2;     // second random per stroke
  float mask;    // 1 inside the stroke, 0 in the gap between strokes
  float across;  // -1..1 across the stroke width
  float along;   // 0..1 along the stroke
  vec2 center;   // stroke centre in p-space
};

Dab dab(vec2 p, vec2 size, float seed) {
  vec2 q = p / size;
  float row = floor(q.y);
  float ro = hash11(row * 1.37 + seed * 17.0) * 19.0;
  float x = q.x + ro;
  float col = floor(x);
  vec2 f = vec2(x - col, q.y - row);
  vec2 cid = vec2(col, row);
  Dab d;
  d.id = hash21(cid + seed * 7.13);
  d.id2 = hash21(cid * 1.7 + 3.1 + seed * 3.7);
  float len = mix(0.66, 1.0, d.id2);
  float ax = abs(f.x - 0.5) * 2.0 / len;
  float ay = abs(f.y - 0.5) * 2.0;
  // a loaded brush: full in the middle, tapering as it lifts off
  float taper = 1.0 - 0.42 * smoothstep(0.25, 1.0, ax);
  d.mask = smoothstep(1.0, 0.74, ax) * smoothstep(taper, taper - 0.40, ay);
  d.across = (f.y - 0.5) * 2.0;
  d.along = f.x;
  d.center = vec2((col + 0.5 - ro) * size.x, (row + 0.5) * size.y);
  return d;
}

// Rotate a colour's hue around the grey axis (cheap, good enough for jitter).
vec3 hueShift(vec3 c, float a) {
  const vec3 k = vec3(0.57735);
  float ca = cos(a), sa = sin(a);
  return c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca);
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 saturate3(vec3 c, float s) { float l = luma(c); return max(vec3(0.0), mix(vec3(l), c, s)); }
`,oa=0,sa=1,ca=2,la=3,ua=4,da=5,fa=56,pa=[[1362,212,176,ca,1,1],[532,626,100,sa,1,-1],[150,52,62,oa,.95,1],[346,40,36,da,.85,-1],[516,46,50,oa,.9,1],[617,75,36,da,.85,-1],[355,207,55,oa,.95,1],[912,97,62,oa,.9,-1],[1055,266,58,oa,.95,1],[489,386,40,da,.8,-1],[68,536,34,sa,.7,1],[196,566,45,oa,.85,-1],[795,432,190,la,1,-1],[1035,560,96,ua,.9,1]];function ma(e,t,n=new W){let r=(2*e-1)*B.tanH,i=(2*t-1)*B.tanV,a=Math.cos(B.pitch),o=Math.sin(B.pitch);return n.set(r,i*a+o,i*o-a).normalize()}function ha(){let e=[];for(let[t,n,r,i,a,o]of pa){let s=t/B.width,c=1-n/B.height,l=ma(s,c),u=l.angleTo(ma(s+r/B.width,c));e.push({dir:l,R:u,type:i,bright:a,spin:o})}let t=ht(1889),n=(t,n)=>e.some(e=>e.dir.angleTo(t)<(e.R+n)*1.05+.02),r=(r,i,a,o,s,c=-Math.PI,l=Math.PI)=>{for(let u=0;u<400;u++){let u=c+(l-c)*t(),d=Math.asin(Math.sin(o)+(Math.sin(s)-Math.sin(o))*t());if(Math.abs(u)<42*Vt&&d<46*Vt)continue;let f=new W(Math.sin(u)*Math.cos(d),Math.sin(d),-Math.cos(u)*Math.cos(d));if(!n(f,r))return e.push({dir:f,R:r,type:i,bright:a}),!0}return!1};r(.15,ua,1,16*Vt,30*Vt,150*Vt,210*Vt),r(.125,la,1,14*Vt,28*Vt,70*Vt,110*Vt),r(.125,ua,1,14*Vt,28*Vt,-110*Vt,-70*Vt),r(.11,la,.9,50*Vt,66*Vt),r(.085,ua,.9,30*Vt,50*Vt,110*Vt,160*Vt),r(.085,la,.9,30*Vt,50*Vt,-160*Vt,-110*Vt);let i=0;for(;e.length<fa&&i++<200;){let e=t(),n=e<.55?oa:e<.8?sa:da;r(.03+.034*t()*t()+(t()<.12?.02:0),n,.7+.3*t(),7*Vt,80*Vt)}return e}var ga=`
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
varying vec3 vDir;
void main() {
  gl_Position = vec4(position.xy, 1.0, 1.0);
  vec4 v = uInvProj * vec4(position.xy, 1.0, 1.0);
  vDir = mat3(uCamWorld) * (v.xyz / v.w);
}
`,_a=`
precision highp float;
#define NS ${fa}
#define NPAINTED ${pa.length}
uniform float uTime;
uniform float uStarGain;
uniform float uFlow;
uniform float uLift;
uniform int uStarCount;
uniform vec4 uStarA[NS];   // xyz direction, w angular radius
uniform vec4 uStarB[NS];   // type, seed, brightness, spin
uniform vec4 uStarC[NS];   // cos(3.05 R)
uniform sampler2D tPainting;   // the scan with the cypress painted out (raw sRGB)
uniform sampler2D tFlow;       // stroke direction (double angle) + coherence
uniform sampler2D tFill;       // the sky with the cypress painted out, blurred: colour for stand-in strokes
uniform vec2 uPaintCS;         // cos / sin of the viewpoint pitch
uniform vec2 uPaintTan;        // tan of half the canvas field, x / y
uniform float uPatch;          // 1 when the scan is loaded
uniform float uAlive;          // 0 = the still canvas, 1 = flowing, burning sky
uniform float uPaintExposure;
uniform float uScan;           // how much of the scan itself shows in the middle of the canvas' part of the sky (0 = none: painted like the rest)
varying vec3 vDir;

${ia}

const float PI = 3.14159265;
const float TAU = 6.28318531;
const float ASPECT = ${B.aspect.toFixed(6)};

vec3 srgb2lin(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}

// Colours measured on the scan itself (linear RGB), dark stroke → pale stroke.
// Everything procedural is painted in the canvas' own palette and then goes
// through the same "come alive" grade as the canvas.
vec3 blueRamp(float v) {
  // (the blues of the scan's sky, by brightness: its darkest twelfth, then its next fifth, third, quarter and
  // palest sixth. His darks keep their blue; his pales lose it.)
  const vec3 c0 = vec3(0.015, 0.026, 0.116);
  const vec3 c1 = vec3(0.033, 0.065, 0.213);
  const vec3 c2 = vec3(0.067, 0.130, 0.288);
  const vec3 c3 = vec3(0.112, 0.200, 0.347);
  const vec3 c4 = vec3(0.203, 0.300, 0.413);
  v = clamp(v, 0.0, 1.0) * 4.0;
  if (v < 1.0) return mix(c0, c1, v);
  if (v < 2.0) return mix(c1, c2, v - 1.0);
  if (v < 3.0) return mix(c2, c3, v - 2.0);
  return mix(c3, c4, v - 3.0);
}

// How one of his strokes stands to the colour of the canvas round it: t = 0 his darkest … 1 his palest,
// as a factor on the mean (the same five bands, each divided by the mean of them all — so that strokes
// toned this way are, taken together, the colour they started from). A stroke merely turned up or down
// in brightness is not one of his: pale, it is electric where his are milky; dark, it is black where
// his are ultramarine.
vec3 strokeTone(float t) {
  const vec3 d0 = vec3(0.172, 0.173, 0.399), d1 = vec3(0.380, 0.432, 0.732), m0 = vec3(0.770, 0.864, 0.989), l1 = vec3(1.287, 1.328, 1.192), l2 = vec3(2.333, 1.995, 1.418);
  if (t < 0.04) return d0;
  if (t < 0.19) return mix(d0, d1, (t - 0.04) / 0.15);
  if (t < 0.45) return mix(d1, m0, (t - 0.19) / 0.26);
  if (t < 0.725) return mix(m0, l1, (t - 0.45) / 0.275);
  return mix(l1, l2, min((t - 0.725) / 0.2, 1.0));
}

vec3 haloRamp(float t, float type) {
  vec3 core, c1, c2, c3;
  if (type < 0.5)      { core = vec3(0.66, 0.50, 0.060); c1 = vec3(0.50, 0.44, 0.100); c2 = vec3(0.36, 0.42, 0.270); c3 = vec3(0.24, 0.33, 0.430); }
  else if (type < 1.5) { core = vec3(0.64, 0.56, 0.130); c1 = vec3(0.56, 0.60, 0.520); c2 = vec3(0.40, 0.46, 0.420); c3 = vec3(0.22, 0.30, 0.380); }
  else if (type < 2.5) { core = vec3(0.74, 0.42, 0.016); c1 = vec3(0.56, 0.56, 0.230); c2 = vec3(0.36, 0.46, 0.330); c3 = vec3(0.16, 0.26, 0.370); }
  else                 { core = vec3(0.66, 0.34, 0.030); c1 = vec3(0.46, 0.40, 0.110); c2 = vec3(0.30, 0.38, 0.300); c3 = vec3(0.20, 0.28, 0.400); }
  float u = clamp(t, 0.0, 1.0) * 3.0;
  if (u < 1.0) return mix(core, c1, u);
  if (u < 2.0) return mix(c1, c2, u - 1.0);
  return mix(c2, c3, u - 2.0);
}

// The moment the painting comes alive: blues deepen and every yellow burns.
vec3 comeAlive(vec3 lin, float flick) {
  vec3 e = sqrt(max(lin, vec3(0.0)));
  float yel = clamp((e.r + e.g) * 0.5 - e.b, 0.0, 1.0);
  float hot = smoothstep(0.16, 0.50, yel) * smoothstep(0.34, 0.66, e.r) * (0.55 + 1.8 * clamp(e.r - e.g, 0.0, 0.25));
  float l = dot(lin, vec3(0.2126, 0.7152, 0.0722));
  // blues deepen; yellows keep their pallor so the crescent still reads against its halo
  vec3 c = max(vec3(0.0), mix(vec3(l), lin, 1.0 + 0.45 * uAlive * (1.0 - 0.85 * smoothstep(0.04, 0.26, yel))));
  return c * (1.0 + uAlive * uStarGain * 2.0 * hot * flick);
}

// One brush stroke of wind. Two interleaved layers of these are laid over one
// another so the sky reads as overlapping wet paint, not as tidy brickwork.
struct Stroke { vec3 col; float fx; float fy; float id; float lenv; float solid; };

// Where on the canvas the direction being shaded falls; how much a stroke there takes the canvas' own colour
// (1 on the canvas, falling away beside it); and how far outside the canvas it is, in canvas widths.
vec2 gUv = vec2(0.5);
float gIn = 0.0;
float gFar = 0.0;

Stroke windStroke(float psi, float az, float lumBase, float band, float layer, vec3 fillCol, float fillW) {
  float W = mix(0.0058, 0.0074, layer);      // (a fifth finer than they were: nearer the canvas' own, and they sit beside it better)
  float L = mix(0.058, 0.045, layer);      // (a fifth shorter than they were, like the width: nearer his)
  float rowf = psi / W + layer * 0.37;
  float row = floor(rowf);
  Stroke s;
  s.fy = rowf - row;
  float elRow = clamp((row + 0.5) * W, 0.0, 1.45);
  float nDash = max(6.0, floor(TAU * cos(elRow) / L));
  float rh = hash11(row * 3.71 + 11.0 + layer * 57.0);
  float xx = (az / TAU + 0.5) * nDash + rh * 37.0
           - uTime * uFlow * (0.4 + 0.9 * hash11(row + 5.5 + layer * 13.0));
  float colI = floor(xx);
  s.fx = xx - colI;
  float idx = mod(colI, nDash);
  s.id = hash21(vec2(idx, row + layer * 211.0));
  float id2 = hash21(vec2(idx + 17.0, row * 1.3 + 3.0 + layer * 97.0));
  float streak = hash11(row * 0.731 + 2.0 + layer * 5.0);
  float lum = lumBase + 0.22 * (streak - 0.5) + 0.26 * (s.id - 0.5);
  vec3 c = blueRamp(lum);
  if (id2 > 0.86) c = mix(c, vec3(0.126, 0.191, 0.255), 0.7);          // grey-teal
  if (id2 < 0.06) c = mix(c, vec3(0.060, 0.050, 0.200), 0.5);          // violet shadow
  c = mix(c, vec3(0.433, 0.490, 0.396), band * smoothstep(0.50, 0.95, id2 * 0.7 + s.id * 0.5) * 0.9);
  // near the canvas, take the canvas' own colour and just break it into strokes
  // (…toned as his are; and as bright, taken together, as the canvas they stand in for — the 1.07 is measured,
  // strokes alone against canvas alone in the margin where the one thins into the other: darker, they made a
  // dark border round the canvas)
  vec3 tone = strokeTone(clamp(s.id + 0.3 * (streak - 0.5), 0.0, 1.0));
  vec3 f = fillCol * tone * 1.03;
  // On the canvas itself a stroke is the colour of the canvas under its middle: the picture, painted
  // again in the hand of the rest of the sky. (The scan shown as it is — however its edge was softened,
  // however the sky round it was tuned to it — stayed a photograph of one painting let into another.)
  // Beside the canvas it is the colour of the canvas' edge at that place, carried on outward — read ever more
  // broadly, and toned ever more freely, with distance. (Past the edge the strokes used to take a ready-blurred
  // copy of the canvas instead: greyer, and the change of colour drew the edge.)
  if (gIn > 0.0) {
    vec2 mid = gUv - vec2((s.fx - 0.5) * TAU / nDash * cos(elRow) / (2.0 * uPaintTan.x), (s.fy - 0.5) * W / (2.0 * uPaintTan.y)) * (1.0 + pow((clamp(gUv, 0.0, 1.0) * 2.0 - 1.0) * uPaintTan, vec2(2.0)));
    vec3 own = srgb2lin(textureLod(tPainting, clamp(mid, 0.012, 0.988), 3.5 + 4.0 * smoothstep(0.0, 0.16, gFar)).rgb) * mix(vec3(1.0), tone, mix(0.3, 1.0, smoothstep(0.0, 0.15, gFar))) * 1.02;
    f = mix(f, own, gIn);
  }
  s.col = mix(c, f, fillW);
  s.lenv = mix(0.66, 1.0, id2);
  s.solid = 0.0;
  return s;
}

// Shade a stroke: bristle streaks, a lit upper edge (impasto), tapered ends.
vec4 lay(Stroke s, float solid) {
  float ax = abs(s.fx - 0.5) * 2.0 / s.lenv;
  float ay = abs(s.fy - 0.5) * 2.0;
  float taper = 1.0 - 0.38 * smoothstep(0.25, 1.0, ax);
  // (crisp-edged: soft-edged they looked out of focus beside the canvas)
  float mask = max(solid, smoothstep(1.0, 0.86, ax) * smoothstep(taper, taper - 0.20, ay));
  float bristle = vnoise(vec2(s.fx * 2.2 + s.id * 31.0, s.fy * 7.0 + s.id * 17.0));
  vec3 c = s.col * mix(0.84 + 0.30 * bristle, 1.0, s.solid);
  c *= 1.0 + 0.22 * (s.fy - 0.5) * 2.0 * (1.0 - solid);
  return vec4(c, mask);
}

void main() {
  vec3 d0 = normalize(vDir);
  float az = atan(d0.x, -d0.z);
  // When the town folds up into a bowl the horizon rises; the whole sky is
  // lifted with it so the low stars and the great curl are never swallowed.
  float el = (asin(clamp(d0.y, -1.0, 1.0)) - uLift) / (1.0 - uLift / 1.5708);
  el = max(el, -1.4);
  vec3 d = vec3(sin(az) * cos(el), sin(el), -cos(az) * cos(el));

  // Stream function: its level sets are the lines the wind is painted along.
  float psi = el
    + 0.045 * sin(az * 4.0 + el * 5.0 + 0.7)
    + 0.024 * sin(az * 9.0 - el * 9.0 + 2.1)
    + 0.011 * sin(az * 17.0 + el * 13.0 + uTime * 0.05);      // (half as much roll again: his sky is never level)

  int best = -1;
  float bestK = 1.2;
  vec2 bxy = vec2(0.0);
  vec2 va = vec2(0.0);     // which way the paint travels (wind + vortices)
  float vw = 0.0;
  for (int i = 0; i < NS; i++) {
    if (i >= uStarCount) break;
    vec4 A = uStarA[i];
    float c = dot(d, A.xyz);
    if (c < uStarC[i].x) continue;
    vec3 e = normalize(cross(A.xyz, vec3(0.0, 1.0, 0.0)));
    vec3 n = cross(e, A.xyz);
    vec2 xy = vec2(dot(d, e), dot(d, n));
    float r = length(xy);
    float R = A.w;
    // the wind parts around every star like water round a stone
    float a = R * 0.80;
    float fall = 1.0 - smoothstep(R * 1.9, R * 3.0, r);
    psi -= xy.y * a * a / max(r * r, a * a * 0.45) * fall;
    float k = r / R;
    if (k < bestK) { bestK = k; best = i; bxy = xy; }
    float wv = 1.0 - smoothstep(R * 1.05, R * 2.1, r);
    va += wv * uStarB[i].w * vec2(-xy.y, xy.x) / max(r, R * 0.15);
    vw += wv;
  }
  va += vec2(1.0, 0.12) * max(0.0, 1.0 - vw);

  // where this direction falls on the canvas (it is the centre of the sky)
  float zc = d.y * uPaintCS.y - d.z * uPaintCS.x;
  vec2 cuv = vec2(-9.0);
  float fillW = 0.0;
  vec3 fillCol = vec3(0.0);
  if (uPatch > 0.5 && zc > 0.05) {
    cuv = vec2(d.x, d.y * uPaintCS.x + d.z * uPaintCS.y) / zc / uPaintTan * 0.5 + 0.5;
    // distance outside the canvas (the painted part of it: the scan's last hundredth is trimmed), in canvas widths
    const vec2 lo0 = vec2(0.010, 0.008), hi0 = vec2(0.990, 0.992);
    vec2 o = max(max(lo0 - cuv, cuv - hi0), 0.0) * vec2(1.0, 1.0 / ASPECT);
    // (a wide hand-over: within a tenth of a canvas-width the palette changing read as an edge)
    float od = length(o);
    gFar = od;
    gIn = 1.0 - smoothstep(0.0, 0.30, od);
    fillW = 1.0 - smoothstep(0.0, 0.42, od);
    fillW *= fillW;
    if (fillW > 0.0) {
      // (the fill has a grey stripe 1.2-1.8% in from each side, left by its blur: sampled there it drew a pale
      // bar down the edge of the canvas)
      vec2 lo = vec2(0.032, 0.014), hi = vec2(0.968, 0.986);
      // (This ready-blurred copy now only colours the strokes well away from the canvas: held outward from the
      // edge and quickly blurred. Mirrored, every star near the frame had a yellow ghost of itself beyond it.)
      fillCol = srgb2lin(textureLod(tFill, clamp(cuv, lo, hi), 5.0 * smoothstep(0.0, 0.035, od)).rgb);
    }
  }

  // (taken here, outside any branch, so the scan is filtered correctly everywhere)
  vec2 cgx = dFdx(cuv), cgy = dFdy(cuv);

  // deep inside the canvas the scan is all there is: skip the strokes
  bool inCanvas = cuv.x > 0.0 && cuv.x < 1.0 && cuv.y > 0.0 && cuv.y < 1.0;
  float edge = inCanvas ? min(min(cuv.x - 0.010, 0.990 - cuv.x), (0.992 - cuv.y) / ASPECT) : -1.0;
  // How much of the scan itself shows here. The canvas' part of the sky is painted twice over: in the hand
  // of the rest of the sky (each stroke the colour of the canvas under it), and, over that, the scan — most
  // of all in the middle, thinning to nothing over a wide margin of uneven depth. So there is his own paint
  // to look at, and no place where it stops. (The scan alone, to its edge: a picture let into another. The
  // strokes alone: too far toward the plain sky, and none of his paint left.)
  float wScan = inCanvas ? uScan * smoothstep(0.0, 0.05 + 0.11 * vnoise3(d * 6.0 + 2.0), edge) : 0.0;
  bool needStrokes = wScan < 0.999;
  float starReal = 0.0, starFoot = 0.0;      // a star of the canvas' own: is it the painted one that shows (decided at its middle, for all of it), and are we on it
  gUv = cuv;
  vec3 col = vec3(0.0);
  if (needStrokes) {
  // ---------------------------------------------------------------- wind
  float big = vnoise3(d * 1.7 + 4.0);
  float band = exp(-pow((el - 0.115) / 0.085, 2.0)) * (0.40 + 0.60 * vnoise3(d * 1.9 + 9.0)) * (1.0 - fillW);
  float lumBase = 0.46 - 0.08 * smoothstep(0.15, 1.2, el) + 0.46 * (big - 0.5) + band * 0.30;
  Stroke sa = windStroke(psi, az, lumBase, band, 0.0, fillCol, fillW);
  Stroke sb = windStroke(psi, az, lumBase, band, 1.0, fillCol, fillW);
  vec4 la = lay(sa, sa.solid);
  vec4 lb = lay(sb, sb.solid);
  // The ground that shows between strokes: dark, out in the plain sky; on the canvas and beside it nearly the
  // strokes' own colour. (Dark there, every stroke had a hard dark edge and his paint has none: where the
  // two met, the edges were what showed.)
  float soft = max(gIn, fillW);
  col = mix(mix(vec3(0.010, 0.017, 0.052), sa.col * 0.55, 0.6), sa.col * 0.90, soft);
  col = mix(col, la.rgb, la.a);
  col = mix(col, lb.rgb, lb.a * step(0.46, sb.id));

  bool take = false;
  float fx = 0.5, fy = 0.5, sid = 0.0, lenv = 1.0, gain = 1.0, solid = 0.0;
  vec3 strokeCol = vec3(0.0);

  // ------------------------------------------------------- stars, moon, curls
  if (best >= 0) {
    vec4 A = uStarA[best];
    vec4 B = uStarB[best];
    float R = A.w, type = B.x, seed = B.y, bright = B.z, spin = B.w;
    float r = length(bxy);
    if (type > 2.5 && type < 4.5) {
      // Archimedean spiral of six interleaved bands: dark trough … pale crest.
      float hand = type < 3.5 ? 1.0 : -1.0;
      const float M = 6.0;
      float w = R * 0.60;
      float thp = mod(hand * atan(bxy.y, bxy.x) + PI + uTime * 0.045 * spin, TAU);
      float um = M * (r / w - thp / TAU);
      float srow = floor(um);
      float sfy = um - srow;
      float j = mod(srow, M);
      float turn = floor(srow / M);
      float rc = r - (sfy - 0.5) * w / M;
      float Th = thp + TAU * turn;
      float s = w * Th * Th / (2.0 * TAU) + (j + 0.5) * (w / M) * Th;
      float sx = s / 0.058 + hash11(j * 5.0 + seed * 3.0) * 7.0 - uTime * uFlow * 1.6;
      float sc = floor(sx);
      float fid = hash21(vec2(sc, j * 7.0) + seed * 5.0);
      float fid2 = hash21(vec2(sc + 9.0, j * 3.0) + seed * 2.0);
      if (rc < R * (0.72 + 0.42 * fid) && rc > 0.0) {
        take = true;
        fx = sx - sc; fy = sfy; sid = fid; lenv = mix(0.7, 1.0, fid2);
        float crest = j < 0.5 ? 0.16 : j < 1.5 ? 0.36 : j < 2.5 ? 0.62 : j < 3.5 ? 1.0 : j < 4.5 ? 0.70 : 0.30;
        float inner = 1.0 - smoothstep(0.0, 1.0, rc / R);
        float v = crest * 0.78 + inner * 0.20 + 0.20 * (fid - 0.5);
        strokeCol = blueRamp(v);
        if (j > 2.5 && j < 3.5) strokeCol = mix(strokeCol, vec3(0.50, 0.55, 0.44), 0.45 + 0.45 * fid2);
        if (fid2 > 0.90) strokeCol = mix(strokeCol, vec3(0.46, 0.44, 0.20), 0.6);
      }
    } else {
      bool moon = type > 1.5 && type < 2.5;
      float rings = clamp(floor(R / 0.0085), 4.0, 14.0);
      float Wr = R / rings;
      float k = floor(r / Wr);
      float rk = (k + 0.5) * Wr;
      float nk = max(5.0, floor(TAU * rk / 0.040 + 0.5));
      float th = atan(bxy.y, bxy.x);
      float sx = (th / TAU + 0.5) * nk + hash11(k * 7.0 + seed * 13.0) * 9.0
               + spin * uTime * 0.030 * nk / (1.0 + k * 0.7);
      float sc = floor(sx);
      float six = mod(sc, nk);
      float fid = hash21(vec2(six, k * 3.0) + seed * 5.0);
      float fid2 = hash21(vec2(six + 5.0, k * 9.0) + seed * 7.0);
      float coreK = moon ? floor(rings * 0.44) : max(1.0, floor(rings * 0.25));
      float twinkle = 0.86 + 0.14 * sin(uTime * (1.1 + seed * 2.3) + seed * 40.0);
      if (k < coreK) {
        // the burning centre: solid paint, no gaps
        take = true; solid = 1.0; sid = fid;
        float rc = r / (Wr * coreK);
        strokeCol = haloRamp(0.0, type) * (1.0 - 0.25 * rc * rc);
        gain = mix(0.9, 1.1, bright) * twinkle;
        if (moon) {
          vec2 q = bxy / (Wr * coreK);
          float cut = length(q - vec2(0.34, 0.26));
          float cres = smoothstep(0.98, 0.92, length(q)) * smoothstep(0.72, 0.80, cut);
          vec3 glow = vec3(0.74, 0.70, 0.30);
          vec3 horn = vec3(0.74, 0.42, 0.016);
          strokeCol = mix(glow, horn, cres);
          gain = 1.0;
        }
      } else if (rk < R * (0.76 + 0.40 * fid)) {
        take = true;
        fx = sx - sc; fy = r / Wr - k; sid = fid; lenv = mix(0.62, 1.0, fid2);
        float t = (k - coreK + 0.5) / (rings - coreK);
        strokeCol = haloRamp(t, type);
        strokeCol = mix(strokeCol, strokeCol.grb, (fid2 - 0.5) * 0.16);
        gain = mix(1.0, bright * twinkle, 0.5);
      }
    }
  }

  // One of the canvas' own stars is the painted one or the drawn one, whole: which, is settled at its middle.
  // (Settled point by point, a star near the margin was the drawn one above and the painted one below, with
  // the drawn one's dark rings cutting across it.)
  if (best >= 0 && best < NPAINTED && uScan > 0.0) {
    vec3 A3 = uStarA[best].xyz;
    float zs = A3.y * uPaintCS.y - A3.z * uPaintCS.x;
    vec2 cs = vec2(A3.x, A3.y * uPaintCS.x + A3.z * uPaintCS.y) / zs / uPaintTan * 0.5 + 0.5;
    float es = min(min(cs.x - 0.010, 0.990 - cs.x), (0.992 - cs.y) / ASPECT);
    starReal = smoothstep(0.30, 0.55, smoothstep(0.0, 0.05 + 0.11 * vnoise3(A3 * 6.0 + 2.0), es));
    starFoot = 1.0 - smoothstep(0.95, 1.2, bestK);
  }
  if (take) {
    Stroke sf;
    sf.col = strokeCol; sf.fx = fx; sf.fy = fy; sf.id = sid; sf.lenv = lenv; sf.solid = 0.0;
    vec4 lf = lay(sf, solid);
    vec3 under = mix(mix(vec3(0.010, 0.017, 0.052), strokeCol * 0.50, 0.6), strokeCol * 0.85, soft);
    col = mix(col, mix(under, lf.rgb, lf.a) * gain, 1.0 - starReal);
  }
  }   // needStrokes

  // ------------------------------------------------- the canvas itself
  // Looking north, the dome is the real painting: projected from the opening
  // viewpoint, its strokes creeping along their own direction once "alive".
  float paintW = 0.0;
  {
    vec2 uv = cuv;
    if (inCanvas) {
      // Toward its edge the canvas thins away into the strokes of the rest of the sky: evenly, as a wash, over
      // a margin of uneven depth. (Tried and thrown out: the strokes let in one at a time, which showed as
      // patches on the canvas; the canvas folded out over its own edge like a mirror, which showed the fold
      // as a crease and its stars twice; that fold let in stroke by stroke, a litter of scraps.)
      // (…a star of its own is painted or drawn, whole — but the painted one still thins away at the very edge of
      // the canvas: the moon's halo reaches it, and held at full strength there it ended in two ruled lines)
      float w = mix(wScan, uScan * starReal * smoothstep(0.0, 0.06, edge), starFoot);
      if (w > 0.001) {
        vec3 f = texture2D(tFlow, uv).rgb;
        float th = 0.5 * atan(f.g * 2.0 - 1.0, f.r * 2.0 - 1.0);
        vec2 t = vec2(cos(th), sin(th));
        t *= sign(dot(t, va) + 1e-4);
        vec2 fl = t * vec2(1.0, ASPECT) * (0.011 * uAlive) * (0.45 + 0.75 * f.b) * (1.0 + 0.5 * min(vw, 1.0));
        float ph = uTime * 0.17 + vnoise(uv * vec2(9.0, 7.0));
        float p0 = fract(ph), p1 = fract(ph + 0.5);
        vec3 c0 = textureGrad(tPainting, clamp(uv - fl * (p0 - 0.5), 0.002, 0.998), cgx, cgy).rgb;
        vec3 c1 = textureGrad(tPainting, clamp(uv - fl * (p1 - 0.5), 0.002, 0.998), cgx, cgy).rgb;
        vec3 pc = mix(c1, c0, 1.0 - abs(2.0 * p0 - 1.0));
        col = mix(col, srgb2lin(pc), w);
        paintW = w;
      }
    }
  }

  float flick = 0.88 + 0.12 * sin(uTime * 1.7 + az * 23.0 + el * 31.0);
  col = comeAlive(col, flick) * uPaintExposure;

  // horizon haze, and something dark below it (hills normally cover this)
  float haze = smoothstep(0.10, -0.03, el) * (1.0 - paintW);
  col = mix(col, vec3(0.040, 0.085, 0.230), haze * 0.75);
  col = mix(col, vec3(0.010, 0.022, 0.060), smoothstep(-0.02, -0.25, el) * (1.0 - paintW));

  gl_FragColor = vec4(col, 1.0);
}
`;function va(e){let t=ha(),n=[],i=[],a=[],o=ht(77);for(let e=0;e<fa;e++){let r=t[e];if(r){n.push(new te(r.dir.x,r.dir.y,r.dir.z,r.R));let e=(r.spin||(o()<.5?-1:1))*(.6+.8*o());i.push(new te(r.type,o()*10,r.bright,e)),a.push(new te(Math.cos(Math.min(r.R*3.05,Math.PI)),0,0,0))}else n.push(new te(0,-1,0,.01)),i.push(new te(0,0,0,0)),a.push(new te(2,0,0,0))}let s=new u;s.setAttribute(`position`,new p(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3));let c=new qe({vertexShader:ga,fragmentShader:_a,uniforms:{uTime:e.uTime,uStarGain:{value:1},uFlow:{value:.11},uLift:e.uSkyLift,uStarCount:{value:t.length},uStarA:{value:n},uStarB:{value:i},uStarC:{value:a},uInvProj:{value:new ut},uCamWorld:{value:new ut},tPainting:{value:null},tFlow:{value:null},tFill:{value:null},uPaintCS:{value:new r(Math.cos(B.pitch),Math.sin(B.pitch))},uPaintTan:{value:new r(B.tanH,B.tanV)},uPatch:{value:0},uAlive:e.uAlive,uPaintExposure:{value:1},uScan:{value:.8}},depthWrite:!1,depthFunc:3}),l=new St(s,c);return l.frustumCulled=!1,l.renderOrder=50,{mesh:l,material:c,features:t,moonDir:t[0].dir.clone(),setCanvas(e,t,n){c.uniforms.tPainting.value=e,c.uniforms.tFlow.value=t,c.uniforms.tFill.value=n,c.uniforms.uPatch.value=1},update(e){c.uniforms.uInvProj.value.copy(e.projectionMatrixInverse),c.uniforms.uCamWorld.value.copy(e.matrixWorld)}}}var ya=[[0,873],[90,880],[180,888],[300,892],[420,890],[540,885],[590,858],[630,835],[700,818],[745,832],[790,852],[840,872],[866,848],[900,800],[990,770],[1100,752],[1200,728],[1275,700],[1335,660],[1372,612],[1440,600],[1500,598]],ba=we.camY,xa=(e,t)=>Math.exp(-(e*e)/(t*t)),Sa=e=>(e=(e+Math.PI)%(Math.PI*2),e<0&&(e+=Math.PI*2),e-Math.PI),Ca=(e,t,n)=>{let r=Math.min(1,Math.max(0,(n-e)/(t-e)));return r*r*(3-2*r)},wa=null;function Ta(e,t){wa||=ya.map(([e,t])=>{let n=ma(e/B.width,1-t/B.height);return[Math.atan2(n.x,-n.z),n.y/Math.hypot(n.x,n.z)]});let n=wa,r;if(e<=n[0][0])r=n[0][1];else if(e>=n[n.length-1][0])r=n[n.length-1][1];else{let t=1;for(;n[t][0]<e;)t++;let i=(e-n[t-1][0])/(n[t][0]-n[t-1][0]),a=i*i*(3-2*i);r=n[t-1][1]+(n[t][1]-n[t-1][1])*a}return ba+t*r}function Ea(e,t){return t===0?52+14*Math.sin(e*3+2)+9*Math.sin(e*5+4)+6*Math.sin(e*11+.9)+3*Math.sin(e*23+4.1)+30*xa(e-2.4,.3)+24*xa(e+2,.25):30+9*Math.sin(e*4+.4)+6*Math.sin(e*7+3.1)+4*Math.sin(e*13+1.7)+2*Math.sin(e*29+.3)}var Da=e=>Math.sqrt(Math.sin(e)**2+.09)-.3,Oa=(e,t)=>14*Da(e*8.3+.6+t*1.7)+8.5*Da(e*13.7+2+t*.9)+2.5*Math.sin(e*29+1+t),ka=(e,t)=>Oa(e,t)-.5*(Oa(Math.PI,t)-Oa(-Math.PI,t))*(e/Math.PI)*Ca(Math.PI-.6,Math.PI,Math.abs(e));function Aa(e,t,n){let r=Sa(e),i=Ca(.86,.5,Math.abs(r)),a=Ta(r,n),o=Ca(Ta(-.4,n),Ta(.5,n),a),s=t===0?Math.max(a,22)+(1-.65*o)*(2+1.15*Oa(r,0)):Math.max(a*.5-2,12)+.9*Oa(r,1);return(Ea(r,t)+.45*ka(r,t+2))*(1-i)+s*i}var ja=`
attribute float aRidge;
attribute float aAz;
uniform vec3 uCenter;
uniform float uBend;
varying float vRidge;
varying float vY;
varying float vAz;
varying float vR;
void main() {
  float R = length(position.xz);
  vec3 wp = vec3(uCenter.x + position.x, position.y + uBend * R * R, uCenter.z + position.z);
  vRidge = aRidge;
  vY = position.y;
  vAz = aAz;
  vR = R;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`,Ma=`
precision highp float;
uniform float uLayer;
uniform float uTime;
uniform float uReveal;
uniform float uAlive;
uniform vec3 uFogColor;
varying float vRidge;
varying float vY;
varying float vAz;
varying float vR;
${ia}
const float TAU = 6.28318531;
const vec3 DARK = vec3(0.013, 0.019, 0.048);
// palette measured on the painted hills
vec3 ramp(float v) {
  vec3 deep = mix(vec3(0.030, 0.049, 0.139), vec3(0.018, 0.030, 0.085), uLayer);
  vec3 mid  = mix(vec3(0.048, 0.086, 0.240), vec3(0.030, 0.056, 0.150), uLayer);
  vec3 lite = mix(vec3(0.090, 0.150, 0.360), vec3(0.050, 0.095, 0.230), uLayer);
  v = clamp(v, 0.0, 1.0);
  return v < 0.5 ? mix(deep, mid, v * 2.0) : mix(mid, lite, v * 2.0 - 1.0);
}
// One coat of strokes: long, thin, running with the slope, as the sky's run with the wind (they are
// the same size on screen). k = 0 is the first coat, 1 a second laid over it at another lean: one coat
// alone, with the dark ground showing round every stroke, read as brickwork next to the canvas.
vec4 coat(float k, float depth, float a01, float circ, float d01) {
  float SL = 0.24 + 0.13 * k;
  float Wh = mix(3.3, 3.9, k);
  float Lh = mix(40.0, 29.0, k);
  float nT = floor(circ * sin(SL) / Wh + 0.5);
  float nS = floor(circ * cos(SL) / Lh + 0.5);
  float wave = 3.2 * sin(vAz * 23.0 + depth * 0.07 + k * 2.0) + 1.7 * sin(vAz * 61.0 - depth * 0.05 + 2.0 + k);
  float t = (depth + wave) * cos(SL) / Wh + a01 * nT + k * 0.5;
  float row = floor(t);
  float fy = t - row;
  float rh = hash11(row * 2.31 + uLayer * 19.0 + k * 7.0);
  float xx = a01 * nS - depth * sin(SL) / Lh + rh * 23.0;
  float c = floor(xx);
  float fx = xx - c;
  float id = hash21(vec2(c, row + uLayer * 50.0 + k * 91.0));
  float id2 = hash21(vec2(c + 7.0, row * 1.9 + 4.0 + uLayer * 50.0 + k * 13.0));
  float v = 0.50 - 0.20 * d01 + 0.62 * (id - 0.5) + 0.24 * (vnoise3(vec3(cos(vAz) * 9.0, sin(vAz) * 9.0, depth * 0.03)) - 0.5);
  vec3 col = ramp(v);
  if (id2 > 0.88) col = mix(col, vec3(0.056, 0.093, 0.109), 0.6);       // grey-green
  if (id2 < 0.12) col = mix(col, vec3(0.168, 0.245, 0.393), 0.6);       // pale highlight
  float lenv = mix(0.7, 1.0, id2);
  float ax = abs(fx - 0.5) * 2.0 / lenv, ay = abs(fy - 0.5) * 2.0;
  float taper = 1.0 - 0.4 * smoothstep(0.2, 1.0, ax);
  float mask = smoothstep(1.0, 0.86, ax) * smoothstep(taper, taper - 0.3, ay);
  float bristle = vnoise(vec2(fx * 2.2 + id * 31.0, fy * 7.0 + id * 17.0));
  col *= 0.84 + 0.30 * bristle;
  col *= 1.0 - 0.16 * (fy - 0.5) * 2.0;
  return vec4(col, mask * step(0.40 * k, id));
}
void main() {
  float depth = vRidge - vY;
  float circ = TAU * vR;
  float a01 = fract(vAz / TAU + 0.5);          // the one seam sits due south, behind the start
  float d01 = clamp(depth / 60.0, 0.0, 1.0);

  // A slow, cloud-soft cross-fade over the painted hills. (Dark strokes switching on one by one over
  // the canvas looked like an attack on it.)
  // (The ring of hills closes due north, in the middle of the opening view, where vAz jumps from 2 pi to 0.
  // Whatever is read off the azimuth has to come round to the same value there: the noise is taken on a
  // circle, the waves have whole or half-whole counts. Noise read straight off vAz faded the two sides of
  // north in at different rates: a ruled vertical line down the hills for as long as they were coming in.)
  float born = vnoise3(vec3(cos(vAz) * 7.0 + uLayer * 3.0, sin(vAz) * 7.0, depth * 0.035));
  float shown = smoothstep(born * 0.25, born * 0.25 + 0.75, uReveal);
  if (shown < 0.004) discard;

  vec4 A = coat(0.0, depth, a01, circ, d01);
  vec4 B = coat(1.0, depth, a01, circ, d01);
  vec3 col = mix(DARK, ramp(0.34 - 0.18 * d01), 0.75);      // the underpainting that shows between strokes
  col = mix(col, A.rgb, A.a);
  col = mix(col, B.rgb, B.a);

  // drawn in outline, as he drew them: the ridge, and the brows of the nearer hills inside it
  float crest = smoothstep(5.2, 1.0, depth + 1.6 * sin(vAz * 37.0));
  float h1 = 34.0 - 15.0 * abs(sin(vAz * 5.5 + 1.1 + uLayer * 2.0)) + 4.0 * sin(vAz * 12.0 + 0.4);
  float h2 = 66.0 - 20.0 * abs(sin(vAz * 3.5 + 2.6 + uLayer)) + 5.0 * sin(vAz * 9.0 + 1.9);
  float brow = max(smoothstep(2.4, 0.7, abs(depth - h1)), 0.8 * smoothstep(2.8, 0.8, abs(depth - h2)));
  // (just under each brow the slope catches the light)
  float lit = max(smoothstep(11.0, 2.5, depth - h1) * step(h1, depth), smoothstep(13.0, 3.0, depth - h2) * step(h2, depth));
  col *= 1.0 + 0.35 * lit * smoothstep(0.55, 1.0, uReveal);
  // (the outlines are inked in last: drawn from the start, they were dark bands arriving on the canvas ahead of the hills)
  col = mix(col, DARK, max(crest * 0.85, brow * 0.7) * smoothstep(0.55, 1.0, uReveal));

  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(vec3(0.0), mix(vec3(l), col, 1.0 + 0.45 * uAlive));

  // the foot of the hills dissolves into the valley haze
  col = mix(col, uFogColor, smoothstep(30.0, 110.0, depth) * 0.9);
  gl_FragColor = vec4(col, shown);
}
`;function Na(e){let t=new Te,n=[];for(let r=0;r<2;r++){let i=fe.hillRadius+(r===0?26:0),a=new Float32Array(4326),o=new Float32Array(1442),s=new Float32Array(1442),c=[];for(let e=0;e<=720;e++){let t=e/720*Math.PI*2,n=Aa(t,r,i),l=Math.sin(t)*i,u=-Math.cos(t)*i;if(a.set([l,n,u,l,-300,u],e*6),o[e*2]=o[e*2+1]=n,s[e*2]=s[e*2+1]=t,e<720){let t=e*2,n=t+1,r=t+2,i=t+3;c.push(t,r,n,n,r,i)}}let l=new u;l.setAttribute(`position`,new p(a,3)),l.setAttribute(`aRidge`,new p(o,1)),l.setAttribute(`aAz`,new p(s,1)),l.setIndex(c);let d=new qe({vertexShader:ja,fragmentShader:Ma,uniforms:{uLayer:{value:r},uTime:e.uTime,uBend:e.uBend,uCenter:e.uBendCenter,uReveal:e.uHillReveal,uAlive:e.uAlive,uFogColor:e.uFogColor},side:2}),f=new St(l,d);f.frustumCulled=!1,f.renderOrder=40-r,t.add(f),n.push(f)}let r=!1;return{group:t,layers:n,setReveal:e=>{let t=e<.999;t!==r&&(r=t,n.forEach((e,n)=>{e.material.transparent=t,e.material.depthWrite=!t,e.renderOrder=t?39+n:40-n,e.material.needsUpdate=!0}))}}}var Pa=`
uniform float uBend;
uniform vec3 uBendCenter;
varying vec3 vCam;
void main() {
  vCam = position;                      // geometry is authored in viewpoint space
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec2 dxz = wp.xz - uBendCenter.xz;
  wp.y += uBend * dot(dxz, dxz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,Fa={x:186,y:1016,lean:.22,bush:270,inner:560},Ia=(e,t,n)=>{let r=Math.min(1,Math.max(0,(n-e)/(t-e)));return r*r*(3-2*r)},La=e=>{let t=e-Fa.y;return Fa.x-Fa.lean*t+Ia(0,44,t)*(7*Math.sin(t/31+.6)+4*Math.sin(t/13+2.1))},Ra=`
precision highp float;
#define CW ${B.width.toFixed(1)}
#define CH ${B.height.toFixed(1)}
#define FOOT_X ${Fa.x.toFixed(1)}
#define FOOT_Y ${Fa.y.toFixed(1)}
#define FOOT_LEAN ${Fa.lean.toFixed(3)}
#define FOOT_BUSH ${Fa.bush.toFixed(1)}
#define FOOT_IN ${Fa.inner.toFixed(1)}
uniform sampler2D tPainting;
uniform sampler2D tCypress;
uniform vec2 uPaintTan;
uniform float uPaintExposure;
uniform float uAlive;
varying vec3 vCam;
vec3 srgb2lin(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
// the left edge of the tree's foot in canvas pixels, f pixels below FOOT_Y (as footEdge() above)
float footEdge(float f) {
  return FOOT_X - FOOT_LEAN * f + smoothstep(0.0, 44.0, f) * (7.0 * sin(f / 31.0 + 0.6) + 4.0 * sin(f / 13.0 + 2.1));
}
void main() {
  vec2 uv = vCam.xy / -vCam.z / uPaintTan * 0.5 + 0.5;
  // Below the canvas edge the paint is mirrored, and sinks into shadow.
  // (The mirror stands a little above the very edge: the last few rows of the scan
  // are bare canvas and the scratches of the frame, pale horizontal dashes that would
  // otherwise run across the tree's foot. The mirrored paint is drawn out to twice
  // its length: at its own size the foot of the tree was plainly its own reflection.)
  float dv = uv.y - 0.040;
  vec2 uvc = vec2(uv.x, clamp(0.040 + (dv < 0.0 ? -0.5 * dv : dv), 0.040, 0.999));
  float f = (1.0 - uv.y) * CH - FOOT_Y;
  if (f > 0.0) {
    float xp = uv.x * CW, xc = footEdge(f);
    if (xp < xc) discard;
    // (the bushes are painted over the foot out to FOOT_BUSH: the tree's own paint is drawn out to its edge instead)
    float xb = max(xc, mix(FOOT_X, FOOT_BUSH, smoothstep(4.0, 46.0, (1.0 - uvc.y) * CH - FOOT_Y)));
    if (xp < FOOT_IN) uvc.x = (FOOT_IN - (FOOT_IN - xp) * (FOOT_IN - xb) / (FOOT_IN - xc)) / CW;
  }
  if (texture2D(tCypress, uvc).r < 0.5) discard;
  vec3 c = srgb2lin(texture2D(tPainting, uvc).rgb);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = max(vec3(0.0), mix(vec3(l), c, 1.0 + 0.3 * uAlive));
  c *= mix(1.0, 0.28, smoothstep(0.075, -0.05, uv.y));
  gl_FragColor = vec4(c * uPaintExposure, 1.0);
}
`,za=[[47,1125,38,42],[130,1105,40,48],[186,1108,24,40],[218,1150,55,50],[141,1160,131,50]],Ba={depth:16.2,base:1160,left:10,right:272,lean:.15,inL:120,inR:200},Va=e=>Ba.left-Ba.lean*e-Ia(0,40,e)*(5*Math.sin(e/27+1)+3*Math.sin(e/11+.4)),Ha=e=>Ba.right+Ba.lean*e+Ia(0,40,e)*(5*Math.sin(e/24+2.2)+3*Math.sin(e/12+1.1)),Ua=(e,t)=>{let n=t-Ba.base;if(n>0)return e>Va(n)&&e<Ha(n);for(let[n,r,i,a]of za){let o=(e-n)/i,s=(t-r)/a;if(o*o+s*s<1)return!0}return!1},Wa=`
precision highp float;
#define CW ${B.width.toFixed(1)}
#define CH ${B.height.toFixed(1)}
#define BUSH_BASE ${Ba.base.toFixed(1)}
#define BUSH_LEFT ${Ba.left.toFixed(1)}
#define BUSH_RIGHT ${Ba.right.toFixed(1)}
#define BUSH_LEAN ${Ba.lean.toFixed(3)}
#define BUSH_INL ${Ba.inL.toFixed(1)}
#define BUSH_INR ${Ba.inR.toFixed(1)}
uniform sampler2D tPainting;
uniform vec2 uPaintTan;
uniform float uPaintExposure;
uniform float uAlive;
varying vec3 vCam;
vec3 srgb2lin(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
// (as bushLeft(), bushRight() and bushIn() above)
float bushL(float f) { return BUSH_LEFT - BUSH_LEAN * f - smoothstep(0.0, 40.0, f) * (5.0 * sin(f / 27.0 + 1.0) + 3.0 * sin(f / 11.0 + 0.4)); }
float bushR(float f) { return BUSH_RIGHT + BUSH_LEAN * f + smoothstep(0.0, 40.0, f) * (5.0 * sin(f / 24.0 + 2.2) + 3.0 * sin(f / 12.0 + 1.1)); }
bool bushIn(vec2 p) {
  float f = p.y - BUSH_BASE;
  if (f > 0.0) return p.x > bushL(f) && p.x < bushR(f);
${za.map(e=>`  if (length((p - vec2(${e[0].toFixed(1)}, ${e[1].toFixed(1)})) / vec2(${e[2].toFixed(1)}, ${e[3].toFixed(1)})) < 1.0) return true;`).join(`
`)}
  return false;
}
void main() {
  vec2 uv = vCam.xy / -vCam.z / uPaintTan * 0.5 + 0.5;
  vec2 p = vec2(uv.x * CW, (1.0 - uv.y) * CH);
  if (!bushIn(p)) discard;
  // below the canvas edge the paint is mirrored, drawn out to twice its length, and sinks into shadow
  // (the mirror stands just above the strip of bare canvas along the edge)
  float dv = uv.y - 0.014;
  vec2 uvc = vec2(uv.x, clamp(0.014 + (dv < 0.0 ? -0.5 * dv : dv), 0.014, 0.999));
  // (where the sides lean out past the painted bank, its paint is drawn out to them)
  float f = p.y - BUSH_BASE;
  if (f > 0.0) {
    if (p.x < BUSH_INL) uvc.x = (BUSH_INL - (BUSH_INL - p.x) * (BUSH_INL - BUSH_LEFT) / (BUSH_INL - bushL(f))) / CW;
    else if (p.x > BUSH_INR) uvc.x = (BUSH_INR + (p.x - BUSH_INR) * (BUSH_RIGHT - BUSH_INR) / (bushR(f) - BUSH_INR)) / CW;
  }
  vec3 c = srgb2lin(texture2D(tPainting, uvc).rgb);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = max(vec3(0.0), mix(vec3(l), c, 1.0 + 0.3 * uAlive));
  c *= mix(1.0, 0.3, smoothstep(0.012, -0.07, uv.y));
  gl_FragColor = vec4(c * uPaintExposure, 1.0);
}
`;function Ga(e,t){let n=B.width,i=B.height,a=Ba.depth,o=1044,s=i+150,c=Math.ceil((s-o)/6),l=a*2*B.tanH/n,d=Math.ceil((s-o)/2)+1,f=new Float32Array(202*d);for(let e=0;e<d;e++)for(let t=0;t<202;t++)f[e*202+t]=Ua(-66+t*2,o+e*2)?1e6:0;let m=(e,t,n,r,i,a)=>{let o=t+r,s=n+i;o>=0&&s>=0&&s<202&&(f[e]=Math.min(f[e],f[o*202+s]+a))};for(let e=0;e<d;e++)for(let t=0;t<202;t++){let n=e*202+t;m(n,e,t,0,-1,1),m(n,e,t,-1,0,1),m(n,e,t,-1,-1,1.414),m(n,e,t,-1,1,1.414)}for(let e=d-1;e>=0;e--)for(let t=201;t>=0;t--){let n=e*202+t;t+1<202&&(f[n]=Math.min(f[n],f[n+1]+1)),e+1<d&&(f[n]=Math.min(f[n],f[n+202]+1),t+1<202&&(f[n]=Math.min(f[n],f[n+202+1]+1.414)),t>0&&(f[n]=Math.min(f[n],f[n+202-1]+1.414)))}let h=(e,t)=>f[Math.min(d-1,Math.round((t-o)/2))*202+Math.min(201,Math.round((e- -66)/2))]*2,g=68*(c+1),_=new Float32Array(g*2*3);for(let e=0;e<=c;e++)for(let t=0;t<=67;t++){let r=-66+t*6,s=o+e*6,c=.5*(Math.min(h(r,s),60)*l)**.6,u=(2*r/n-1)*B.tanH,d=(1-2*s/i)*B.tanV,f=e*68+t,p=a-c,m=a+c*1.15;_.set([u*p,d*p,-p],f*3),_.set([u*m,d*m,-m],(g+f)*3)}let v=[];for(let e=0;e<c;e++)for(let t=0;t<67;t++){let n=!1;for(let r=0;r<=3&&!n;r++)for(let i=0;i<=3;i++)if(Ua(-66+(t+i/3)*6,o+(e+r/3)*6)){n=!0;break}if(!n)continue;let r=e*68+t,i=r+1,a=r+67+1,s=a+1;v.push(r,a,i,i,a,s),v.push(g+r,g+i,g+a,g+i,g+s,g+a)}let y=new u;y.setAttribute(`position`,new p(_,3)),y.setIndex(v),y.computeBoundingSphere();let b=new qe({vertexShader:Pa,fragmentShader:Wa,uniforms:{tPainting:{value:t},uPaintTan:{value:new r(B.tanH,B.tanV)},uPaintExposure:{value:1},uAlive:e.uAlive,uBend:e.uBend,uBendCenter:e.uBendCenter},side:2}),x=new St(y,b);return x.frustumCulled=!1,x.renderOrder=5,x}function Ka(e,t,n){let i=B.width,a=B.height,o=Mt.cypressDepth,s=document.createElement(`canvas`);s.width=i,s.height=a;let c=s.getContext(`2d`,{willReadFrequently:!0});c.drawImage(n.image,0,0,i,a);let l=c.getImageData(0,0,i,a).data,d=(e,t,n)=>{let r=t<a?t:2*a-2-t;return l[(Math.min(a-1,Math.max(0,r))*i+Math.min(i-1,Math.max(0,e)))*4+n]},f=(e,t)=>t>Fa.y&&e<La(t)?0:d(e,t,0)/255,m=(e,t)=>Math.min(d(e,t,1)/255*160,t>Fa.y?Math.max(0,e-La(t)):1/0),h=a+150,g=Math.ceil((h-24)/8),_=o*2*B.tanH/i,v=new Uint8Array(91*g);for(let e=0;e<g;e++)for(let t=0;t<91;t++){let n=0,r=0+t*8-1,i=24+e*8-1;for(let e=i;e<=i+8+2&&!n;e+=2)for(let t=r;t<=r+8+2;t+=2)if(f(t,e)>.02){n=1;break}v[e*91+t]=n}let y=92*(g+1),b=new Float32Array(y*2*3);for(let e=0;e<=g;e++)for(let t=0;t<=91;t++){let n=0+t*8,r=24+e*8,s=m(n,r)*_,c=f(n,r)>.3?.7*s**.6:0,l=(2*n/i-1)*B.tanH,u=(1-2*r/a)*B.tanV,d=e*92+t,p=o-c,h=o+c*1.15;b.set([l*p,u*p,-p],d*3),b.set([l*h,u*h,-h],(y+d)*3)}let x=[];for(let e=0;e<g;e++)for(let t=0;t<91;t++){if(!v[e*91+t])continue;let n=e*92+t,r=n+1,i=n+91+1,a=i+1;x.push(n,i,r,r,i,a),x.push(y+n,y+r,y+i,y+r,y+a,y+i)}let S=new u;S.setAttribute(`position`,new p(b,3)),S.setIndex(x),S.computeBoundingSphere();let C=new qe({vertexShader:Pa,fragmentShader:Ra,uniforms:{tPainting:{value:t},tCypress:{value:n},uPaintTan:{value:new r(B.tanH,B.tanV)},uPaintExposure:{value:1},uAlive:e.uAlive,uBend:e.uBend,uBendCenter:e.uBendCenter},side:2}),w=new St(S,C);return w.frustumCulled=!1,w.renderOrder=5,w.add(Ga(e,t)),w}var qa=`
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,Ja=`
precision highp float;
uniform sampler2D tSrc;
uniform vec2 uTexel;      // source texel
uniform float uThreshold;
uniform float uKnee;
varying vec2 vUv;
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 pre(vec3 c) {
  c = min(c, vec3(48.0));
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-4);
  float contrib = max(soft, br - uThreshold) / max(br, 1e-4);
  return c * contrib;
}
void main() {
  // 4 bilinear taps, Karis-weighted so single hot pixels do not flicker
  vec3 a = pre(texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb);
  vec3 b = pre(texture2D(tSrc, vUv + uTexel * vec2( 1.0, -1.0)).rgb);
  vec3 c = pre(texture2D(tSrc, vUv + uTexel * vec2(-1.0,  1.0)).rgb);
  vec3 d = pre(texture2D(tSrc, vUv + uTexel * vec2( 1.0,  1.0)).rgb);
  float wa = 1.0 / (1.0 + luma(a)), wb = 1.0 / (1.0 + luma(b));
  float wc = 1.0 / (1.0 + luma(c)), wd = 1.0 / (1.0 + luma(d));
  gl_FragColor = vec4((a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd), 1.0);
}
`,Ya=`
precision highp float;
uniform sampler2D tSrc;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec2 h = uTexel * 0.5;
  vec3 s = texture2D(tSrc, vUv).rgb * 4.0;
  s += texture2D(tSrc, vUv - h).rgb;
  s += texture2D(tSrc, vUv + h).rgb;
  s += texture2D(tSrc, vUv + vec2(h.x, -h.y)).rgb;
  s += texture2D(tSrc, vUv - vec2(h.x, -h.y)).rgb;
  gl_FragColor = vec4(s / 8.0, 1.0);
}
`,Xa=`
precision highp float;
uniform sampler2D tSrc;     // smaller mip being upsampled
uniform sampler2D tAdd;     // this level's own content
uniform vec2 uTexel;        // texel of tSrc
uniform float uSpread;
uniform float uMix;         // how much of the wider glow to keep at this level
varying vec2 vUv;
void main() {
  vec2 h = uTexel * uSpread;
  vec3 s = texture2D(tSrc, vUv + vec2(-h.x * 2.0, 0.0)).rgb;
  s += texture2D(tSrc, vUv + vec2(-h.x, h.y)).rgb * 2.0;
  s += texture2D(tSrc, vUv + vec2(0.0, h.y * 2.0)).rgb;
  s += texture2D(tSrc, vUv + vec2(h.x, h.y)).rgb * 2.0;
  s += texture2D(tSrc, vUv + vec2(h.x * 2.0, 0.0)).rgb;
  s += texture2D(tSrc, vUv + vec2(h.x, -h.y)).rgb * 2.0;
  s += texture2D(tSrc, vUv + vec2(0.0, -h.y * 2.0)).rgb;
  s += texture2D(tSrc, vUv + vec2(-h.x, -h.y)).rgb * 2.0;
  gl_FragColor = vec4(mix(texture2D(tAdd, vUv).rgb, s / 12.0, uMix), 1.0);
}
`,Za=`
precision highp float;
uniform sampler2D tDepth;
uniform mat4 uInvProj;
uniform vec2 uProjScale;
uniform vec2 uTexel;
uniform vec2 uFull;         // size of the depth buffer, in texels
uniform float uRadius;
uniform float uIntensity;
varying vec2 vUv;
// The position seen at uv. This pass runs at half resolution, so its pixel
// centres fall exactly on the seams between depth texels; left alone, each
// lookup rounds to one side or the other at random, and on ground seen at a
// shallow angle that put alternate rows a whole texel of depth apart — stripes
// of false shadow. So every lookup is moved to the centre of the texel it
// actually reads.
vec3 viewPos(vec2 uv) {
  uv = (floor(uv * uFull) + 0.5) / uFull;
  float d = texture2D(tDepth, uv).x;
  vec4 p = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  return p.xyz / p.w;
}
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main() {
  float d = texture2D(tDepth, vUv).x;
  if (d > 0.99995) { gl_FragColor = vec4(1.0); return; }
  vec3 P = viewPos(vUv);
  vec3 Pr = viewPos(vUv + vec2(uTexel.x, 0.0)), Pl = viewPos(vUv - vec2(uTexel.x, 0.0));
  vec3 Pu = viewPos(vUv + vec2(0.0, uTexel.y)), Pd = viewPos(vUv - vec2(0.0, uTexel.y));
  vec3 dx = abs(Pr.z - P.z) < abs(P.z - Pl.z) ? Pr - P : P - Pl;
  vec3 dy = abs(Pu.z - P.z) < abs(P.z - Pd.z) ? Pu - P : P - Pd;
  vec3 N = normalize(cross(dx, dy));
  // face the eye (not simply +z: seen from a camera tilted upward, the ground's
  // normal leans away from the viewer, and flipping it buried the bottom of the
  // frame in shadow)
  if (dot(N, P) > 0.0) N = -N;
  float z = -P.z;
  float R = uRadius * (1.0 + z * 0.018);
  vec2 rUv = min(R * uProjScale / z, vec2(0.11));
  float rot = ign(gl_FragCoord.xy) * 6.2831853;
  const int NS = 11;
  float R2 = R * R;
  float occ = 0.0;
  for (int i = 0; i < NS; i++) {
    float a = (float(i) + 0.5) / float(NS);
    float ang = a * 6.2831853 * 2.6 + rot;
    vec2 suv = vUv + vec2(cos(ang), sin(ang)) * a * rUv;
    // nothing is known about what lies beyond the edge of the frame
    if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
    vec3 S = viewPos(suv);
    vec3 v = S - P;
    float vv = dot(v, v), vn = dot(v, N);
    float f = max(R2 - vv, 0.0);
    occ += f * f * f * max((vn - 0.012 * z - 0.03) / (vv + 0.01), 0.0);
  }
  float ao = max(0.0, 1.0 - occ * 5.0 / (R2 * R2 * R2 * float(NS)) * uIntensity);
  gl_FragColor = vec4(ao, ao, ao, 1.0);
}
`,Qa=`
precision highp float;
uniform sampler2D tAO;
uniform sampler2D tDepth;
uniform vec2 uDir;          // one texel along the blur axis
uniform float uNear;
uniform float uFar;
varying vec2 vUv;
float lin(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return 2.0 * uNear * uFar / (uFar + uNear - (2.0 * d - 1.0) * (uFar - uNear));
}
void main() {
  float zc = lin(vUv);
  float sum = texture2D(tAO, vUv).r * 0.22, wsum = 0.22;
  for (int i = 1; i <= 3; i++) {
    float w = 0.20 - 0.045 * float(i);
    for (int s = -1; s <= 1; s += 2) {
      vec2 uv = vUv + uDir * float(i * s) * 1.5;
      float k = w * max(0.0, 1.0 - abs(lin(uv) - zc) / (0.06 * zc + 0.15));
      sum += texture2D(tAO, uv).r * k; wsum += k;
    }
  }
  gl_FragColor = vec4(vec3(sum / wsum), 1.0);
}
`,$a=`
precision highp float;
uniform sampler2D tScene;
uniform sampler2D tDepth;
uniform sampler2D tBloom;
uniform sampler2D tAO;
uniform float uAO;
uniform vec2 uRes;
uniform float uNear;
uniform float uFar;
uniform float uExposure;
uniform float uBloom;
uniform float uPaint;       // edge break-up, in 1080p pixels
uniform float uOutline;
uniform float uSaturation;
uniform float uContrast;
uniform float uVignette;
uniform float uTime;
uniform float uHdrPeak;     // 1 = SDR; >1 lets highlights exceed display white
uniform sampler2D tPainting; // the untouched scan, for the opening frame
uniform vec4 uHole;         // where the framed canvas sits on screen (uv: x0, y0, x1, y1)
uniform float uTitleMix;    // 1 = show the scan exactly, 0 = the living scene
uniform float uRush;        // hyper mode: the edges of the picture streak toward the eye
varying vec2 vUv;

${ia}

// 1/z, which is linear across the screen for any flat surface
float invZ(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return (uFar + uNear - (2.0 * d - 1.0) * (uFar - uNear)) / (2.0 * uFar * uNear);
}

vec3 aces(vec3 x) {
  return (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
}
float aces1(float x) {
  return (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
}

void main() {
  float sc = uRes.y / 1080.0;
  vec2 frag = gl_FragCoord.xy / sc;

  // Every on-screen dab of the brush nudges the picture by a constant amount,
  // so silhouettes break into stroke-shaped steps instead of ruler lines.
  const float ang = 0.42;
  mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 q = (R * frag) / vec2(30.0, 10.0);
  float row = floor(q.y);
  q.x += hash11(row * 1.7) * 11.0;
  vec2 cell = vec2(floor(q.x), row);
  vec2 jit = hash22(cell) - 0.5;
  vec2 q2 = (R * frag.yx) / vec2(17.0, 6.0);
  float row2 = floor(q2.y);
  q2.x += hash11(row2 * 2.3 + 5.0) * 7.0;
  vec2 jit2 = hash22(vec2(floor(q2.x), row2) + 31.0) - 0.5;
  vec2 off = (jit * 2.0 + jit2 * 1.2) * uPaint * sc / uRes;
  // Only what is far off is broken up like this. Anything near slides quickly
  // across the screen as he rides by, and edges stepping about under a fixed
  // pattern read as the houses warping — so they keep a clean line.
  float zHere = 1.0 / max(invZ(vUv), 1e-6);
  off *= mix(0.1, 1.0, smoothstep(12.0, 75.0, zHere));
  // …and the sky is not broken up at all. It is all brushwork already; and its stars and whorls
  // swimming under a pattern fixed to the screen, every time he turns, read as the heavens warping.
  // Nor are the hills: their ridge stepping about under the same fixed pattern as he turns read as the hills warping.
  off *= 1.0 - smoothstep(170.0, 300.0, zHere);
  vec2 uv = vUv + off;

  vec3 col = texture2D(tScene, uv).rgb;
  if (uRush > 0.002) {
    // everything but the middle of the frame smears outward along its line of flight
    vec2 dv = uv - vec2(0.5, 0.54);
    float k = uRush * 0.11 * smoothstep(0.015, 0.30, dot(dv, dv));
    float wsum = 1.0;
    for (int i = 1; i <= 6; i++) {
      float t = float(i) / 6.0, w = 1.0 - 0.13 * float(i);
      col += texture2D(tScene, uv - dv * k * t).rgb * w; wsum += w;
    }
    col /= wsum;
  }
  // contact shade — but never on things that are themselves alight
  float ao = texture2D(tAO, uv).r;
  float lumHere = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col *= mix(1.0, ao, uAO * (1.0 - smoothstep(0.9, 2.6, lumHere)));

  // Dark, wobbling contour lines wherever depth breaks — Vincent outlined
  // his roofs, hills and cypress in prussian blue.
  float wob = 0.55 + 0.9 * vnoise(frag / 26.0);
  vec2 o = (1.15 * wob * sc) / uRes;
  float wc = invZ(uv);
  float w1 = invZ(uv + vec2(o.x, 0.0)), w2 = invZ(uv - vec2(o.x, 0.0));
  float w3 = invZ(uv + vec2(0.0, o.y)), w4 = invZ(uv - vec2(0.0, o.y));
  float lap = abs(w1 + w2 - 2.0 * wc) + abs(w3 + w4 - 2.0 * wc);
  float wmax = max(max(max(w1, w2), max(w3, w4)), wc);
  float e = lap / max(wmax, 1e-6);
  float edge = smoothstep(0.012, 0.06, e);
  float nearZ = 1.0 / max(wmax, 1e-6);
  edge *= mix(1.0, 0.45, smoothstep(60.0, 380.0, nearZ));
  edge *= 0.55 + 0.45 * vnoise(frag / 7.0 + 3.0);
  col = mix(col, col * vec3(0.05, 0.07, 0.20) + vec3(0.002, 0.004, 0.016), edge * uOutline);

  vec3 bloom = texture2D(tBloom, vUv).rgb;
  col += bloom * uBloom;

  col *= uExposure;

  // filmic curve: half hue-preserving, half per-channel so that the hottest
  // lamps and stars burn through to yellow-white
  float m = max(col.r, max(col.g, col.b));
  vec3 hp = col * (aces1(m) / max(m, 1e-5));
  vec3 pc = aces(col);
  vec3 tm = mix(hp, pc, 0.55);
  if (uHdrPeak > 1.0) {
    // extended range: let what the curve compressed come back above white
    vec3 over = max(col - vec3(1.0), vec3(0.0));
    tm += (uHdrPeak - 1.0) * (1.0 - exp(-over * 0.35));
  }
  col = tm;

  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(vec3(0.0), mix(vec3(l), col, uSaturation));
  col = mix(col, col * col * (3.0 - 2.0 * col), uContrast * step(uHdrPeak, 1.0));

  // canvas tooth + grain (also dithers the deep blues)
  float tooth = vnoise(gl_FragCoord.xy * 0.55) - 0.5;
  float grain = hash21(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5;
  col *= 1.0 + tooth * 0.045;
  vec2 vv = vUv - 0.5;
  col *= 1.0 - uVignette * dot(vv, vv) * 1.6;

  col = max(col, vec3(0.0));
  vec3 enc = mix(col * 12.92, 1.055 * pow(col, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));
  enc += grain * (1.5 / 255.0);

  // The opening frame IS the painting. It then gives way to the living scene
  // one brush-dab at a time.
  if (uTitleMix > 0.001) {
    vec2 huv = (vUv - uHole.xy) / (uHole.zw - uHole.xy);
    if (huv.x > 0.0 && huv.x < 1.0 && huv.y > 0.0 && huv.y < 1.0) {
      float n = hash21(cell * 1.7 + 4.0) * 0.18 + vnoise(frag / 150.0) * 0.82;      // (cloud-soft: hardly dab by dab)
      float a = smoothstep(n * 0.5, n * 0.5 + 0.5, uTitleMix);      // (a wide, soft front: the scan melts into the scene rather than flaking off it)
      // …and its rectangle melts from the edges inward, so no hard-edged picture is left hanging in the scene
      float rim = min(min(huv.x, 1.0 - huv.x), min(huv.y, 1.0 - huv.y) * (uHole.w - uHole.y) / (uHole.z - uHole.x) * uRes.y / uRes.x);
      a *= smoothstep(0.0, 0.0005 + 0.30 * (1.0 - uTitleMix), rim);
      enc = mix(enc, texture2D(tPainting, huv).rgb, a);
    }
  }
  gl_FragColor = vec4(enc, 1.0);
}
`,eo=6,to=class{constructor(e){this.renderer=e,this.width=4,this.height=4;let t=new s(4,4);t.type=f,t.minFilter=t.magFilter=V,this.sceneRT=new F(4,4,{type:Oe,format:Pt,minFilter:H,magFilter:H,depthBuffer:!0,stencilBuffer:!1,depthTexture:t}),this.sceneRT.texture.generateMipmaps=!1;let n=()=>{let e=new F(2,2,{type:Oe,format:Pt,minFilter:H,magFilter:H,depthBuffer:!1,stencilBuffer:!1});return e.texture.generateMipmaps=!1,e},i=()=>{let e=new F(2,2,{type:de,format:Pt,minFilter:H,magFilter:H,depthBuffer:!1,stencilBuffer:!1});return e.texture.generateMipmaps=!1,e};this.aoA=i(),this.aoB=i(),this.down=[],this.up=[];for(let e=0;e<eo;e++)this.down.push(n()),this.up.push(n());let a=(e,t)=>new qe({vertexShader:qa,fragmentShader:e,uniforms:t,depthTest:!1,depthWrite:!1});this.prefilter=a(Ja,{tSrc:{value:null},uTexel:{value:new r},uThreshold:{value:1},uKnee:{value:.6}}),this.downMat=a(Ya,{tSrc:{value:null},uTexel:{value:new r}}),this.upMat=a(Xa,{tSrc:{value:null},tAdd:{value:null},uTexel:{value:new r},uSpread:{value:1},uMix:{value:.62}}),this.bloomRadius=.62,this.depthMaterial=null,this.aoMat=a(Za,{tDepth:{value:t},uInvProj:{value:new ut},uProjScale:{value:new r},uTexel:{value:new r},uFull:{value:new r(4,4)},uRadius:{value:1.5},uIntensity:{value:1.25}}),this.aoBlur=a(Qa,{tAO:{value:null},tDepth:{value:t},uDir:{value:new r},uNear:{value:.1},uFar:{value:2e3}}),this.composite=a($a,{tScene:{value:this.sceneRT.texture},tDepth:{value:t},tBloom:{value:null},tAO:{value:this.aoA.texture},uAO:{value:.85},uRes:{value:new r(4,4)},uNear:{value:.1},uFar:{value:2e3},uExposure:{value:1},uBloom:{value:.7},uPaint:{value:0},uOutline:{value:.85},uSaturation:{value:1.18},uContrast:{value:.22},uVignette:{value:.35},uTime:{value:0},uHdrPeak:{value:1},tPainting:{value:null},uHole:{value:new te(0,0,1,1)},uTitleMix:{value:0},uRush:{value:0}});let o=new u;o.setAttribute(`position`,new p(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3)),this.quad=new St(o,this.composite),this.quad.frustumCulled=!1,this.fsScene=new at,this.fsScene.add(this.quad),this.fsCam=new it(-1,1,1,-1,0,1)}setSize(e,t){if(e=Math.max(4,Math.floor(e)),t=Math.max(4,Math.floor(t)),e===this.width&&t===this.height)return;this.width=e,this.height=t,this.sceneRT.setSize(e,t),this.aoA.setSize(Math.max(2,e>>1),Math.max(2,t>>1)),this.aoB.setSize(Math.max(2,e>>1),Math.max(2,t>>1));let n=e,r=t;for(let e=0;e<eo;e++)n=Math.max(2,Math.floor(n/2)),r=Math.max(2,Math.floor(r/2)),this.down[e].setSize(n,r),this.up[e].setSize(n,r);this.composite.uniforms.uRes.value.set(e,t)}pass(e,t){this.quad.material=e,this.renderer.setRenderTarget(t),this.renderer.render(this.fsScene,this.fsCam)}render(e,t,n,r=!1){let i=this.renderer;if(r){let e=this.composite.uniforms;e.uTime.value=n,this.pass(this.composite,null);return}i.setRenderTarget(this.sceneRT),i.clear(!0,!0,!1),this.depthMaterial&&(t.layers.set(1),e.overrideMaterial=this.depthMaterial,i.render(e,t),e.overrideMaterial=null,t.layers.set(0)),i.render(e,t);let a=this.aoMat.uniforms;a.uInvProj.value.copy(t.projectionMatrixInverse),a.uProjScale.value.set(t.projectionMatrix.elements[0]*.5,t.projectionMatrix.elements[5]*.5),a.uTexel.value.set(1/this.aoA.width,1/this.aoA.height),a.uFull.value.set(this.width,this.height),this.pass(this.aoMat,this.aoA);let o=this.aoBlur.uniforms;o.uNear.value=t.near,o.uFar.value=t.far,o.tAO.value=this.aoA.texture,o.uDir.value.set(1/this.aoA.width,0),this.pass(this.aoBlur,this.aoB),o.tAO.value=this.aoB.texture,o.uDir.value.set(0,1/this.aoA.height),this.pass(this.aoBlur,this.aoA),this.prefilter.uniforms.tSrc.value=this.sceneRT.texture,this.prefilter.uniforms.uTexel.value.set(.5/this.width,.5/this.height),this.pass(this.prefilter,this.down[0]);for(let e=1;e<eo;e++){let t=this.down[e-1];this.downMat.uniforms.tSrc.value=t.texture,this.downMat.uniforms.uTexel.value.set(1/t.width,1/t.height),this.pass(this.downMat,this.down[e])}let s=this.down[5];for(let e=4;e>=0;e--)this.upMat.uniforms.tSrc.value=s.texture,this.upMat.uniforms.tAdd.value=this.down[e].texture,this.upMat.uniforms.uTexel.value.set(1/s.width,1/s.height),this.upMat.uniforms.uMix.value=this.bloomRadius,this.pass(this.upMat,this.up[e]),s=this.up[e];let c=this.composite.uniforms;c.tBloom.value=this.up[0].texture,c.uNear.value=t.near,c.uFar.value=t.far,c.uTime.value=n,this.pass(this.composite,null)}},no=`
attribute vec3 color;
attribute vec4 aData;
attribute vec4 aLamp;
attribute vec4 aLamp2;
uniform float uBend;
uniform vec3 uBendCenter;
uniform float uTime;
#ifdef DYNAMIC
uniform vec4 uDynLamp;
#endif
#ifdef WALKER
// Townsfolk are posed entirely here: what each one is doing (aAct) drives a
// small skeleton — hips, knees, shoulders, elbows, head — and every vertex
// knows which bone it hangs from (aPart) and where that bone's joints are.
attribute vec4 aWalkA;     // xyz: where they stand, or one end of their walk (chunk-local); w: speed, m/s
attribute vec4 aWalkB;     // xyz: what they face, or the other end; w: phase 0..1
attribute vec4 aAct;       // x: what they are doing; y, z: its parameters; w: the figure's sideways offset
attribute vec4 aPart;      // x: bone + scale/2; y, z: its joint; w: height of the joint above it
uniform vec3 uHeadPos;     // the bicycle: people look round at it, and step out of its way
uniform vec4 uHold;        // someone being spoken to stops and turns to the rider: xy where their walk begins (world x, z), z the moment they stopped, w how far into it they are (0…1)
void rotX(inout vec3 p, inout vec3 n, float py, float pz, float a) {
  float c = cos(a), s = sin(a);
  float vy = p.y - py, vz = p.z - pz;
  p.y = py + vy * c + vz * s;
  p.z = pz - vy * s + vz * c;
  n.yz = vec2(n.y * c + n.z * s, -n.y * s + n.z * c);
}
void rotY(inout vec3 p, inout vec3 n, float a) {
  float c = cos(a), s = sin(a);
  p.xz = vec2(p.x * c + p.z * s, -p.x * s + p.z * c);
  n.xz = vec2(n.x * c + n.z * s, -n.x * s + n.z * c);
}
#endif
varying vec3 vColor;
varying vec2 vUv;
varying vec4 vData;
varying vec4 vLamp;
varying vec4 vLamp2;
varying vec3 vPos;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vDist;
invariant gl_Position;
void main() {
  vec3 pos = position;
  vec3 nrm = normal;
#ifdef WALKER
  float pid = floor(aPart.x + 0.001);
  float sc = fract(aPart.x) * 2.0;                  // the figure's size (1 = a grown man)
  float mode = floor(aAct.x + 0.001);
  vec3 A = aWalkA.xyz, Bq = aWalkB.xyz;
  vec2 dAB = Bq.xz - A.xz;
  float len = max(length(dAB), 0.001);
  vec2 dir = dAB / len;
  float speed = aWalkA.w, ph = aWalkB.w;
  float tt = uTime + ph * 97.0;                     // everyone keeps their own time
  vec3 origin = A;
  float yawT = 0.0;                                 // turned this far (to the left) from the line A-B
  float g = 0.0, phi = ph * 6.2832;                 // the gait: how much, and where in the stride
  float hipL = 0.0, hipR = 0.0, kneeL = 0.0, kneeR = 0.0;
  float shL = 0.0, shR = 0.0, elL = 0.2, elR = 0.2;
  float lean = 0.02, twist = 0.0, bob = 0.0, hYaw = 0.0, hPitch = 0.0, swayX = 0.0;
  float hipY = 0.92 * sc;
  float notice = 1.0, dodge = 1.0;                  // how much they mind the bicycle
  bool held = uHold.w > 0.01 && distance((modelMatrix * vec4(A, 1.0)).xz, uHold.xy) < 0.08;      // (the one being spoken to)
  if (mode < 0.5) {
    // standing about: weight shifting from foot to foot, looking round
    swayX = 0.012 * sin(tt * 0.7);
    hYaw = 0.5 * aAct.y * sin(tt * 0.31) * sin(tt * 0.13 + 1.0);
    elL = 0.25; elR = 0.3;
  } else if (mode < 1.5) {
    // walking somewhere: there, a pause (turned to a shop window, a doorway), and back
    float tw = len / max(speed, 0.05);
    float dB = aAct.y, dA2 = abs(aAct.z), tau = 1.5708 * sign(aAct.z);
    float T = 2.0 * tw + dB + dA2;
    // (stopped to talk: their own clock stands still, so they stay where they were)
    float tWalk = held ? uHold.z : uTime;
    float u = fract(tWalk / T + ph) * T;
    float s = 0.0, ramp = 0.0, idle = 0.0;
    if (u < tw) { s = u / tw; ramp = min(u, tw - u); }
    else if (u < tw + dB) { float v = u - tw; s = 1.0; idle = 1.0; yawT = tau * (smoothstep(0.0, 0.7, v) + smoothstep(dB - 0.7, dB, v)); }
    else if (u < 2.0 * tw + dB) { float v = u - tw - dB; s = 1.0 - v / tw; ramp = min(v, tw - v); yawT = 2.0 * tau; }
    else { float v = u - 2.0 * tw - dB; idle = 1.0; yawT = tau * (2.0 - smoothstep(0.0, 0.7, v) - smoothstep(dA2 - 0.7, dA2, v)); }
    origin = mix(A, Bq, s);
    g = smoothstep(0.0, 0.5, ramp);
    if (held) g *= 1.0 - uHold.w;                     // (…and stands, rather than being caught in mid-stride)
    phi += 3.14159 * s * len / (0.78 * sc);          // (feet are planted by distance, so they never slide)
    hYaw = idle * 0.3 * sin(tt * 0.9);
    swayX = idle * 0.01 * sin(tt * 0.7);
  } else if (mode < 2.5) {
    // in conversation: one talks with his hands while the other listens and nods, turn about
    float turn = fract(uTime * 0.085 + ph);
    float speak = smoothstep(0.0, 0.06, turn) * (1.0 - smoothstep(0.5, 0.56, turn));
    shR = speak * (0.55 + 0.25 * sin(tt * 2.3));
    elR = 0.45 + speak * (1.0 + 0.45 * sin(tt * 3.1) * sin(tt * 1.3));
    elL = 0.3 + 0.35 * speak * max(sin(tt * 1.7), 0.0);
    hPitch = (1.0 - speak) * 0.11 * max(sin(tt * 2.6), 0.0) * step(0.3, sin(tt * 0.37));
    hYaw = 0.12 * sin(tt * 0.5);
    swayX = 0.014 * sin(tt * 0.6);
    lean = 0.03 + 0.03 * speak;
  } else if (mode < 3.5) {
    // seated at a table: now and then the glass comes up
    hipY = 0.50 * sc;
    float cyc = fract(uTime * (0.06 + 0.05 * fract(ph * 7.0)) + ph);
    float sip = aAct.y * smoothstep(0.0, 0.07, cyc) * (1.0 - smoothstep(0.17, 0.24, cyc));
    elL = 0.0; elR = sip * 1.3; shR = sip * 0.55;
    hPitch = -0.2 * sip + 0.05 * sin(tt * 0.4);
    hYaw = 0.25 * sin(tt * 0.23) * (1.0 - sip);
    lean = 0.06 + 0.04 * sin(tt * 0.31);
    notice = 0.5; dodge = 0.0;
  } else if (mode < 4.5) {
    // going round: a couple waltzing (they face each other), or children chasing round the fountain
    float th = uTime * aAct.y;
    float c = cos(th), s = sin(th);
    vec2 rad = vec2(dir.x * c + dir.y * s, -dir.x * s + dir.y * c);
    origin = A + vec3(rad.x, 0.0, rad.y) * len;
    if (aAct.z < 0.5) {
      origin.xz += 1.1 * vec2(cos(uTime * 0.31 + A.x), sin(uTime * 0.31 + A.x));
      yawT = th + 3.14159;
      g = 0.42; phi = uTime * 5.2;
      shL = 1.25; elL = 0.3; shR = 1.0; elR = 1.15; lean = -0.03;
      notice = 0.0;
    } else {
      yawT = th + 1.5708 * sign(aAct.y);
      g = 1.0; phi += 3.14159 * abs(th) * len / (0.78 * sc);
      lean = 0.12; elL = 0.9; elR = 0.9;
      notice = 0.3;
    }
    dodge = 0.0;
  } else if (mode < 5.5) {
    // at work
    float w = aAct.y;
    if (w < 0.5) {            // sweeping the step
      twist = 0.32 * sin(tt * 2.4); shL = 0.5; shR = 0.62; elL = 0.6 + 0.2 * sin(tt * 2.4); elR = 0.5; lean = 0.2; hPitch = 0.25;
    } else if (w < 1.5) {     // the fiddler
      shL = 1.2; elL = 1.9; shR = 0.85 + 0.1 * sin(tt * 5.1); elR = 1.15 + 0.5 * sin(tt * 5.1); hYaw = 0.35; swayX = 0.02 * sin(tt * 1.3); twist = 0.06 * sin(tt * 1.3);
    } else if (w < 2.5) {     // the painter at his easel
      float dab = step(0.35, fract(tt * 0.11));
      shR = dab * (1.15 + 0.12 * sin(tt * 1.7)); elR = 0.3 + dab * (0.3 + 0.25 * sin(tt * 2.9)); shL = 0.25; elL = 1.2;
      hPitch = (1.0 - dab) * -0.12; lean = 0.03 - 0.05 * (1.0 - dab);
    } else if (w < 3.5) {     // crying his wares
      float up = smoothstep(0.55, 0.7, sin(tt * 0.5));
      shR = up * 2.2; elR = 0.4 + up * 0.5 * sin(tt * 6.0); elL = 0.9; shL = 0.25; hYaw = 0.4 * sin(tt * 0.27);
    } else if (w < 4.5) {     // bent over the billiard table, lining up the shot
      float strike = smoothstep(0.86, 0.9, fract(tt * 0.13)) * (1.0 - smoothstep(0.9, 0.98, fract(tt * 0.13)));
      lean = 0.85; shL = 1.5; elL = 0.2; shR = -0.45 + 0.5 * strike; elR = 1.5 - 0.5 * strike; hPitch = -0.55;
    } else {                  // the lamplighter, reaching up with his pole
      shL = 2.35 + 0.05 * sin(tt * 0.9); shR = 2.1; elL = 0.25; elR = 0.5; hPitch = -0.5; lean = -0.04;
    }
    notice = 0.35;
  } else {
    // a thing, not a person: it only stands where it was put
    lean = 0.0; notice = 0.0; dodge = 0.0;
  }
  if (g > 0.001) {
    hipL = 0.47 * g * sin(phi); hipR = -hipL;
    kneeL = g * (0.10 + 0.95 * pow(max(cos(phi - 0.55), 0.0), 2.0));
    kneeR = g * (0.10 + 0.95 * pow(max(-cos(phi - 0.55), 0.0), 2.0));
    shL -= 0.72 * hipL; shR -= 0.72 * hipR;         // arms swing against the legs
    elL += 0.2 * g; elR += 0.2 * g;
    bob = -0.04 * sc * g * sin(phi) * sin(phi);
    twist += 0.09 * g * sin(phi);
    lean += 0.035 * g;
  }
  // spoken to, they turn to face whoever is speaking (unless they are sitting down, or bent over a billiard table)
  if (held && (mode < 2.5 || (mode > 4.5 && mode < 5.5 && (aAct.y < 3.5 || aAct.y > 4.5)))) {
    vec2 toR = uHeadPos.xz - (modelMatrix * vec4(origin, 1.0)).xz;
    float lr = length(toR);
    if (lr > 0.3) {
      toR /= lr;
      float turn = atan(dir.y * toR.x - dir.x * toR.y, dot(dir, toR)) - yawT;
      yawT += atan(sin(turn), cos(turn)) * smoothstep(0.0, 1.0, uHold.w);
      dodge = 0.0;
    }
  }
  // which way they face; then the bicycle: heads turn to it, and nobody stands in its way
  float cyw = cos(yawT), syw = sin(yawT);
  vec2 f2 = vec2(dir.x * cyw + dir.y * syw, -dir.x * syw + dir.y * cyw);
  vec3 wo = (modelMatrix * vec4(origin, 1.0)).xyz;
  vec2 away = wo.xz - uHeadPos.xz;
  float dR = length(away);
  vec2 awayN = away / max(dR, 0.01);
  float level = step(abs(wo.y - uHeadPos.y + 0.85), 2.5);
  origin.xz += awayN * (0.85 * smoothstep(2.5, 0.8, dR) * dodge * level);
  float rel = atan(dot(-awayN, vec2(f2.y, -f2.x)), dot(-awayN, f2));
  hYaw = mix(hYaw, clamp(rel, -1.2, 1.2), notice * level * smoothstep(12.0, 6.0, dR) * step(abs(rel), 2.1));

  // ── the skeleton
  pos.x -= aAct.w;
  float pvY = aPart.y, pvZ = aPart.z, ppY = aPart.w;
  if (pid > 0.5 && pid < 4.5) {
    bool first = pid < 1.5 || (pid > 2.5 && pid < 3.5);
    float hipA = first ? hipL : hipR, kneeA = first ? kneeL : kneeR;
    if (pid > 2.5) { rotX(pos, nrm, pvY, pvZ, -kneeA); rotX(pos, nrm, ppY, 0.0, hipA); }
    else rotX(pos, nrm, pvY, pvZ, hipA);
  } else if (pid > 4.5 && pid < 8.5) {
    bool first = pid < 5.5 || (pid > 6.5 && pid < 7.5);
    float shA = first ? shL : shR, elA = first ? elL : elR;
    if (pid > 6.5) { rotX(pos, nrm, pvY, pvZ, elA); rotX(pos, nrm, ppY, 0.0, shA); }
    else rotX(pos, nrm, pvY, 0.0, shA);
  } else if (pid > 8.5 && pid < 9.5) {
    rotX(pos, nrm, pvY, 0.0, -hPitch);
    rotY(pos, nrm, hYaw);
  } else if (pid > 9.5 && pid < 10.5) {
    // a skirt or coat-tail swings with the leg behind each half of it
    rotX(pos, nrm, pvY, 0.0, (pos.x < 0.0 ? hipL : hipR) * 0.6 * clamp(abs(pos.x) / (0.14 * sc), 0.0, 1.0));
  }
  if (pid < 0.5 || (pid > 4.5 && !(pid > 9.5 && pid < 10.5))) {
    // everything above the hips leans and turns with the trunk
    rotX(pos, nrm, hipY, 0.0, -lean);
    rotY(pos, nrm, twist * smoothstep(hipY, hipY + 0.5 * sc, pos.y));
  }
  pos.y += bob;
  pos.x += swayX + aAct.w;
  vec3 fw = vec3(f2.x, 0.0, f2.y);
  vec3 rt = vec3(f2.y, 0.0, -f2.x);
  pos = origin + rt * pos.x + vec3(0.0, pos.y, 0.0) + fw * pos.z;
  nrm = rt * nrm.x + vec3(0.0, nrm.y, 0.0) + fw * nrm.z;
#endif
  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vWorld = wp.xyz;
#ifdef DYNAMIC
  vPos = wp.xyz;
  vLamp = uDynLamp;
  vLamp2 = vec4(0.0, -999.0, 0.0, 0.0);
#else
  vPos = pos;
  vLamp = aLamp;
  vLamp2 = aLamp2;
#endif
  vNormal = normalize(mat3(modelMatrix) * nrm);
  vec2 dxz = wp.xz - uBendCenter.xz;
  wp.y += uBend * dot(dxz, dxz);
  vec4 mv = viewMatrix * wp;
  vDist = length(mv.xyz);
  vColor = color;
  vUv = uv;
  vData = aData;
  gl_Position = projectionMatrix * mv;
}
`,ro=`
precision highp float;
uniform float uTime;
uniform float uStrokeDist;
uniform float uGlow;
uniform float uAlive;
uniform vec3 uFogColor;
uniform vec2 uFogRange;
uniform vec3 uMoonDir;
uniform vec3 uMoonCol;
uniform vec3 uAmbSky;
uniform vec3 uAmbGround;
uniform vec3 uWarmCol;
uniform vec3 uHeadPos;
uniform vec3 uHeadDir;
uniform float uHeadPower;
uniform sampler2D tCanvas;       // the painting itself, for the pictures hung in the gallery
varying vec3 vColor;
varying vec2 vUv;
varying vec4 vData;
varying vec4 vLamp;
varying vec4 vLamp2;
varying vec3 vPos;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vDist;

${ia}
${aa}

float gIndoor = 0.0;     // 1 under a roof: no moon, no sky; the warm dusk of a lamplit room

// One street lamp. Its pool is fully gone by 17 m, so the two lamps a surface
// carries are all the lamps that can reach it (no seams between surfaces).
void lampTerm(vec4 lamp, vec3 P, vec3 Nd, vec3 Nb, vec3 V, float shin, inout vec3 diff, inout vec3 spec) {
  vec3 toL = lamp.xyz - P;
  float d2 = dot(toL, toL);
  float att = lamp.w / (1.0 + d2 * 0.085) * smoothstep(289.0, 40.0, d2);
  if (att <= 0.0) return;
  vec3 Ld = toL * inversesqrt(d2 + 1e-3);
  float k = att * uGlow * mix(0.3, 1.0, uAlive);
  diff += uWarmCol * (k * (0.22 + 0.78 * max(dot(Nd, Ld), 0.0)) * 5.6);
  spec += uWarmCol * (k * pow(max(dot(Nb, normalize(Ld + V)), 0.0), shin) * 6.5);
}

// Light arriving at P. Ng is the true surface normal, Nb the normal of the
// ridge of paint at this spot; spill is window-light from nearby houses.
void shade(vec3 P, vec3 Pw, vec3 Ng, vec3 Nb, vec3 V, float shin, float spill, out vec3 diff, out vec3 spec) {
  vec3 Nd = normalize(mix(Ng, Nb, 0.5));
  float sky = 1.0 - gIndoor;
  diff = mix(mix(uAmbGround, uAmbSky, Nd.y * 0.5 + 0.5), vec3(0.24, 0.14, 0.06) * (0.75 + 0.25 * Nd.y), gIndoor);
  spec = vec3(0.0);
  // the moon
  diff += uMoonCol * (max(dot(Nd, uMoonDir), 0.0) * sky);
  spec += uMoonCol * (pow(max(dot(Nb, normalize(uMoonDir + V)), 0.0), shin) * 1.5 * step(0.02, dot(Ng, uMoonDir)) * sky);
  // street lamps
  lampTerm(vLamp, P, Nd, Nb, V, shin, diff, spec);
  lampTerm(vLamp2, P, Nd, Nb, V, shin, diff, spec);
  // lit windows spilling onto the street
  float sp = spill * uGlow * uAlive;
  diff += uWarmCol * vec3(1.0, 1.08, 1.22) * (sp * 1.05);
  // the bicycle lamp: a soft-edged cone
  vec3 toH = Pw - uHeadPos;
  float h2 = dot(toH, toH);
  vec3 dh = toH * inversesqrt(h2 + 1e-3);
  float cone = smoothstep(0.66, 0.97, dot(dh, uHeadDir));
  cone = cone * cone * uHeadPower / (1.0 + h2 * 0.011);
  vec3 headCol = uWarmCol * vec3(1.0, 1.06, 1.16);
  diff += headCol * (cone * (0.3 + 0.7 * max(dot(Nd, -dh), 0.0)));
  spec += headCol * (cone * pow(max(dot(Nb, normalize(V - dh)), 0.0), shin) * 2.6);
  // wet paint mirrors the sky (and the windows) at grazing angles
  float fr = pow(1.0 - max(dot(Nb, V), 0.0), 5.0);
  spec += (uAmbSky * 0.9 * sky + uWarmCol * (sp * 1.3 + 0.35 * gIndoor)) * fr;
}

mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

void main() {
  // nothing exists beyond the ring of hills
  if (vDist > uFogRange.y + 4.0) discard;
  float kind = floor(vData.x + 0.5);
  float seed = vData.y;
  gIndoor = step(1.5, seed);
  seed = fract(seed);
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 base = vColor;
  vec2 uvx = dFdx(vUv), uvy = dFdy(vUv);
  vec3 pdx = dFdx(vPos), pdy = dFdy(vPos);

  if (kind == 15.0) {
    // a framed canvas in the gallery: the painting, hung inside itself
    vec3 c = textureGrad(tCanvas, vUv, uvx, uvy).rgb;
    c = mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
    vec3 dC, sC;
    shade(vPos, vWorld, N, N, V, 24.0, 0.5, dC, sC);
    vec3 colC = c * (dC * 1.15 + 0.22 * uAlive) + sC * 0.05;
    float fogC = pow(smoothstep(uFogRange.x, uFogRange.y, vDist), 1.5);
    gl_FragColor = vec4(mix(colC, uFogColor, fogC * 0.97), 1.0);
    return;
  }

  if (kind == 18.0) {
    // a gold prism: polished metal, each face mirroring warm lamplight below
    // and the pale sky above, with a hard glint as it turns
    vec3 gold = vec3(1.0, 0.74, 0.22);
    vec3 Rf = reflect(-V, N);
    vec3 env = mix(vec3(0.50, 0.24, 0.04), vec3(1.0, 0.93, 0.66), smoothstep(-0.35, 0.85, Rf.y));
    float facet = 0.6 + 0.4 * dot(N, normalize(vec3(0.35, 0.8, 0.25)));
    float glint = pow(max(dot(Rf, normalize(vec3(0.3, 0.75, 0.4))), 0.0), 22.0) + pow(max(dot(Rf, normalize(vec3(-0.5, 0.5, -0.6))), 0.0), 40.0);
    float rimP = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 cP = gold * (0.45 * facet + 0.85 * env) + vec3(1.0, 0.95, 0.78) * (glint * 2.4 + rimP * 0.8);
    float fogP = pow(smoothstep(uFogRange.x, uFogRange.y, vDist), 1.5);
    gl_FragColor = vec4(cP * vData.z * mix(0.35, 1.0, uAlive) * uGlow * (1.0 - fogP * 0.8), 1.0);
    return;
  }

  if (kind == 10.0) {            // pure light: lantern glass, lamps
    gl_FragColor = vec4(base * vData.z * mix(0.3, 1.0, uAlive) * uGlow, 1.0);
    return;
  }

  // ───────────── stroke space for this kind of surface
  vec2 p = vUv;
  vec2 size = vec2(0.30, 0.075);
  float valVar = 0.55, hueVar = 0.35, accent = 0.0;
  float gloss = 0.2, shin = 26.0, relief = 0.8, spill = 0.0, rim = 0.0;
  float soft = 0.0;          // how nearly the ground under the strokes matches them (flesh is laid smooth)
  vec3 accentCol = vec3(0.0);
  vec3 emis = vec3(0.0);
  float halo = 0.0;

  if (kind == 1.0) {
    // ── walls: horizontal strokes; windows, shutters and doors are painted in
    float stories = vData.z;
    float flags = vData.w;
    float litP = fract(flags);
    float fl = floor(flags + 1e-4);
    bool shop = fl == 1.0;
    bool church = fl == 2.0;
    vec2 w = vUv;
    p = w * vec2(2.7, 3.0);
    p.y += 0.035 * sin(p.x * 3.1 + seed * 40.0);
    size = vec2(0.48, 0.105);
    valVar = 0.5; hueVar = 0.30;
    gloss = 0.16; shin = 18.0; relief = 0.85;
    // (a wall with real openings carries no painted ones: its p2 is the glow of the windows beside it)
    if (stories < 0.5) spill = flags;
    if (w.y > 0.0 && w.y < stories) {
      vec2 cell = floor(w);
      vec2 f = w - cell;
      bool ground = cell.y < 0.5;
      float r1 = hash21(cell * 1.31 + seed * 91.7);
      float r2 = hash21(cell * 2.17 + seed * 37.3 + 5.0);
      float r3 = hash21(cell * 3.71 + seed * 11.9 + 9.0);
      bool door = ground && !shop && !church && r2 < 0.26;
      vec2 hs = vec2(0.19, 0.27);
      vec2 ctr = vec2(0.5, 0.52);
      if (shop && ground) { hs = vec2(0.40, 0.31); ctr = vec2(0.5, 0.43); }
      if (door) { hs = vec2(0.17, 0.37); ctr = vec2(0.5, 0.37); }
      if (church) { hs = vec2(0.15, 0.36); ctr = vec2(0.5, 0.48); }
      vec2 c = (f - ctr) / hs;
      float wob = (vnoise(w * 5.0 + seed * 13.0) - 0.5) * 0.22;
      float bx = abs(c.x), by = abs(c.y);
      // doors and church windows have a round head
      if ((door || church) && c.y > 0.45) { bx = length(vec2(c.x, (c.y - 0.45) / 0.55)); by = bx; }
      float box = max(bx, by) + wob;
      float inside = smoothstep(1.0, 0.86, box);
      float trim = smoothstep(1.52, 1.38, box) * (1.0 - inside);
      float litOn = step(r1, litP * mix(0.35, 1.0, uAlive));
      if (shop && ground) litOn = step(r1, 0.92 * uAlive + 0.05);
      // shutters either side of ordinary windows
      if (!door && !shop && !church) {
        float sh = step(1.55, abs(c.x)) * step(abs(c.x), 2.42) * step(abs(c.y), 1.12 + wob);
        float sr = hash11(seed * 53.0 + 2.0);
        vec3 shCol = sr < 0.35 ? vec3(0.030, 0.150, 0.110) : sr < 0.65 ? vec3(0.030, 0.090, 0.260) : sr < 0.85 ? vec3(0.200, 0.045, 0.030) : vec3(0.020, 0.160, 0.190);
        base = mix(base, shCol, sh * step(hash11(seed * 7.0), 0.75));
      }
      vec3 trimCol = mix(base * 1.7 + 0.03, vec3(0.42, 0.38, 0.30), 0.4);
      base = mix(base, trimCol, trim * 0.85);
      if (door) {
        vec3 wood = mix(vec3(0.090, 0.040, 0.020), vec3(0.020, 0.070, 0.060), step(0.5, r3));
        base = mix(base, wood, inside);
      } else {
        // glass: dark when nobody is home, burning (and flickering a little) when someone is
        float mull = max(smoothstep(0.10, 0.03, abs(c.x)), smoothstep(0.09, 0.03, abs(c.y - 0.12)));
        if (shop && ground) mull = max(smoothstep(0.04, 0.01, abs(fract(c.x * 1.5 + 0.5) - 0.5)), smoothstep(0.06, 0.02, abs(c.y - 0.62)));
        vec3 warm = mix(vec3(1.00, 0.80, 0.32), vec3(1.00, 0.48, 0.11), r2);
        if (church) warm = mix(warm, vec3(0.55, 0.75, 1.0), 0.35 * step(0.5, r3));
        float flick = 1.0 + 0.07 * sin(uTime * (2.0 + 5.0 * r1) + r2 * 40.0) + 0.04 * sin(uTime * 11.0 * r3 + r1 * 9.0);
        float bright = (1.7 + 2.4 * r3) * (shop && ground ? 1.25 : 1.0) * flick;
        base = mix(base, vec3(0.012, 0.020, 0.050), inside);
        emis = warm * bright * inside * litOn * (1.0 - 0.72 * mull) * (0.80 + 0.35 * f.y);
        halo = litOn * (1.0 - inside) * exp(-max(box - 1.0, 0.0) * 2.3) * (shop && ground ? 1.5 : 1.0);
        gloss = mix(gloss, 0.9, inside * (1.0 - litOn));         // dark panes glint
      }
      // far away, a house is a mood of light rather than countable panes
      float farK = smoothstep(150.0, 300.0, vDist);
      emis = mix(emis, vec3(1.0, 0.62, 0.20) * (litP * 0.42) * uAlive, farK);
    }
  } else if (kind == 2.0) {
    // ── roofs: strokes run down the slope like courses of tile
    p = vec2(vUv.y + 0.06 * sin(vUv.x * 2.3 + seed * 30.0), vUv.x);
    size = vec2(0.66, 0.17);
    valVar = 0.75; hueVar = 0.40;
    accent = 0.10; accentCol = base * vec3(1.7, 1.5, 1.2) + 0.02;
    gloss = 0.5; shin = 22.0; relief = 1.0;
  } else if (kind == 3.0) {
    // ── cobbles: stubby dabs in every colour the lamps can find, slick as if after rain
    p = vData.z > 0.5 ? vUv.yx : vUv;
    p.y += 0.07 * sin(p.x * 1.9 + p.y * 0.7);
    size = vec2(0.34, 0.185);
    valVar = 0.85; hueVar = 0.9;
    accent = 0.16; accentCol = mix(vec3(0.30, 0.13, 0.26), vec3(0.10, 0.16, 0.34), step(0.5, hash21(floor(p * 3.0))));
    gloss = 0.62; shin = 40.0; relief = 0.95; spill = vData.w;
  } else if (kind == 4.0) {
    // ── a dirt road: long ochre and rose streaks
    p = vData.z > 0.5 ? vUv.yx : vUv;
    p.y += 0.22 * sin(p.x * 0.55 + p.y * 0.3);
    size = vec2(0.95, 0.15);
    valVar = 0.6; hueVar = 0.5;
    accent = 0.12; accentCol = vec3(0.32, 0.16, 0.20);
    gloss = 0.14; shin = 14.0; relief = 0.9; spill = vData.w;
  } else if (kind == 5.0 || kind == 13.0) {
    // ── grass: short curling strokes
    if (kind == 5.0 && vData.z > 0.5) {
      // (in the other canvases — portals/ — the strokes are turned this way and that by bending the page they
      // are laid on, a little, everywhere: turned about one far-off point, as the town's are, they wind into
      // rings round wherever that point happens to be)
      p = rot2(seed * 6.2832) * vUv;
      p += 1.3 * vec2(sin(p.y * 0.37 + 1.7 * sin(p.x * 0.11)), sin(p.x * 0.29 + 1.3 * sin(p.y * 0.13)));
    } else {
      float a = vnoise(vUv * 0.07 + seed) * 6.28;
      p = rot2(a) * vUv;
    }
    p.y += 0.25 * sin(p.x * 1.1);
    size = vec2(0.72, 0.125);
    valVar = 0.8; hueVar = 0.6;
    accent = 0.14; accentCol = vec3(0.16, 0.26, 0.05);
    gloss = 0.10; shin = 12.0; relief = 0.9; spill = vData.w;
  } else if (kind == 6.0) {
    // ── wheat: waves of gold
    if (vData.z > 0.0) {
      // (…laid as the grass of those canvases is: see above)
      p = rot2(0.5 + seed) * vUv;
      p += 1.6 * vec2(sin(p.y * 0.23 + 1.5 * sin(p.x * 0.07)), sin(p.x * 0.19 + 1.2 * sin(p.y * 0.09)));
    } else {
      float a = 0.5 + (vnoise(vUv * 0.03 + seed * 3.0) - 0.5) * 1.6;
      p = rot2(a) * vUv;
    }
    // (in the other canvases — portals/ — the wheat is in the wind, and vData.z says how much: the strokes run
    // along themselves and back in long gusts, and the swell they lie in travels. In the town it is 0.)
    p.x += vData.z * 0.30 * sin(uTime * 1.05 + vnoise(vUv * 0.06 + 2.0) * 9.0);
    p.y += 0.45 * sin(p.x * 0.6 + vnoise(vUv * 0.11) * 5.0 + vData.z * uTime * 0.6);
    size = vec2(1.15, 0.11);
    valVar = 0.75; hueVar = 0.45;
    accent = 0.10; accentCol = vec3(0.10, 0.20, 0.10);
    gloss = 0.16; shin = 14.0; relief = 1.0; spill = vData.w;
  } else if (kind == 7.0) {
    // ── flagstones of a square
    p = vUv;
    p.y += 0.05 * sin(p.x * 1.3);
    size = vec2(0.58, 0.30);
    valVar = 0.7; hueVar = 0.7;
    accent = 0.12; accentCol = vec3(0.26, 0.14, 0.24);
    gloss = 0.55; shin = 42.0; relief = 0.85; spill = vData.w;
  } else if (kind == 8.0) {
    // ── cypress: dark flames licking upward
    p = vec2(vUv.y + 0.6 * sin(vUv.x * 1.1 + vUv.y * 0.35), vUv.x + 0.35 * sin(vUv.y * 0.8 + seed * 20.0));
    size = vec2(1.15, 0.20);
    valVar = 1.0; hueVar = 0.5;
    accent = 0.07; accentCol = vec3(0.12, 0.07, 0.02);
    gloss = 0.14; shin = 10.0; relief = 1.2; rim = 0.35;
  } else if (kind == 9.0) {
    // ── olive and plane trees: curls, like the grove behind the village
    float a = vnoise(vUv * 0.9 + seed * 9.0) * 9.0;
    p = rot2(a) * vUv;
    size = vec2(0.52, 0.15);
    valVar = 1.0; hueVar = 0.7;
    accent = 0.20; accentCol = vec3(0.22, 0.32, 0.36);
    gloss = 0.16; shin = 10.0; relief = 1.2; rim = 0.3;
  } else if (kind == 11.0) {
    // ── dressed stone
    p = vUv;
    p.y += 0.03 * sin(p.x * 2.7);
    size = vec2(0.56, 0.15);
    valVar = 0.55; hueVar = 0.45;
    accent = 0.08; accentCol = vec3(0.30, 0.34, 0.40);
    gloss = 0.28; shin = 20.0; relief = 0.9;
  } else if (kind == 12.0) {
    // ── cloth / awnings: stripes
    p = vUv;
    size = vec2(0.40, 0.09);
    base = mix(base, vec3(0.62, 0.56, 0.42), step(0.5, fract(vUv.x * 1.6)) * 0.8);
    valVar = 0.4; hueVar = 0.2;
    gloss = 0.06; relief = 0.6;
  } else if (kind == 19.0) {
    // ── water by night (the other canvases: portals/): short level strokes laid side by side, every row of
    // them slipping along at a pace of its own — prussian blue, cobalt, and a green where the lamps get into it
    p = vUv;
    p.x += uTime * 0.17 + 0.6 * sin(p.y * 0.83 + uTime * 0.21) + 0.3 * sin(p.y * 2.7 - uTime * 0.33);
    p.y += 0.05 * sin(p.x * 1.4 + uTime * 0.5);
    size = vec2(0.92, 0.105);
    valVar = 1.0; hueVar = 0.5;
    accent = 0.15; accentCol = vec3(0.04, 0.26, 0.26);
    gloss = 0.85; shin = 46.0; relief = 0.9; spill = vData.w;
  } else if (kind == 20.0) {
    // ── a pale road between fields (the other canvases): long strokes of grey and lilac running with it, and
    // green and straw-yellow ones laid in among them
    p = vData.z > 0.5 ? vUv.yx : vUv;
    p.y += 0.3 * sin(p.x * 0.42 + p.y * 0.25);
    size = vec2(1.35, 0.14);
    valVar = 0.5; hueVar = 0.35;
    accent = 0.24; accentCol = mix(vec3(0.16, 0.36, 0.13), vec3(0.62, 0.50, 0.16), step(0.5, hash21(floor(p * vec2(0.8, 6.0)))));
    gloss = 0.16; shin = 14.0; relief = 0.9; spill = vData.w;
  } else if (kind == 16.0 || kind == 17.0) {
    // ── things set into a wall. uv runs 0..1 across the opening; its true size
    // in metres comes from how fast the surface moves under it.
    vec2 g = vUv;
    vec3 gpx = pdx, gpy = pdy;
    float gdet = uvx.x * uvy.y - uvy.x * uvx.y;
    float ginv = abs(gdet) > 1e-12 ? 1.0 / gdet : 0.0;
    vec3 gT = (gpx * uvy.y - gpy * uvx.y) * ginv;          // one opening-width, in space
    vec3 gB = (gpy * uvx.x - gpx * uvy.x) * ginv;          // one opening-height
    float gw = clamp(length(gT), 0.05, 12.0), gh = clamp(length(gB), 0.05, 12.0);
    float type = floor(vData.z + 0.5);
    if (kind == 17.0) {
      // ── joinery: louvred shutters, panelled doors, boarded doors
      vec2 q = g * vec2(gw, gh);                            // metres across the leaf
      float edge = min(min(q.x, gw - q.x), min(q.y, gh - q.y));
      float stile = smoothstep(0.075, 0.06, edge);          // the frame round the leaf
      if (type < 0.5) {
        float sl = fract(q.y / 0.058);
        float slat = mix(0.42, 1.12, smoothstep(0.0, 0.75, sl)) * (1.0 - 0.5 * smoothstep(0.86, 1.0, sl));
        float midRail = smoothstep(0.055, 0.04, abs(q.y - gh * 0.5));
        base *= mix(slat, 1.0, max(stile, midRail));
        p = vec2(q.x, q.y); size = vec2(0.22, 0.045);
      } else if (type < 1.5) {
        vec2 pg = vec2(q.x / gw * 2.0, q.y / gh * 3.0);
        vec2 pf = abs(fract(pg) - 0.5);
        float inset = smoothstep(0.40, 0.36, max(pf.x, pf.y * 1.0));
        float bevel = smoothstep(0.30, 0.36, max(pf.x, pf.y)) * inset;
        base *= mix(1.0, 0.80, inset) * (1.0 - 0.35 * bevel);
        base = mix(base, base * 1.18, stile * 0.5);
        // a brass knob
        base = mix(base, vec3(0.75, 0.52, 0.16), smoothstep(0.045, 0.03, length(q - vec2(gw - 0.13, gh * 0.46))));
        p = vec2(q.y, q.x); size = vec2(0.26, 0.05);
      } else {
        float bd = fract(q.x / 0.17);
        base *= 1.0 - 0.45 * smoothstep(0.10, 0.0, min(bd, 1.0 - bd));
        base *= 0.9 + 0.2 * hash11(floor(q.x / 0.17) + seed * 31.0);
        // ledges and strap hinges
        float ledge = max(smoothstep(0.07, 0.05, abs(q.y - gh * 0.2)), smoothstep(0.07, 0.05, abs(q.y - gh * 0.82)));
        base = mix(base, vec3(0.020, 0.020, 0.026), ledge * 0.85);
        p = vec2(q.y, q.x); size = vec2(0.30, 0.05);
      }
      valVar = 0.34; hueVar = 0.2;
      gloss = 0.30; shin = 20.0; relief = 0.6;
    } else {
      // ── a window: sash and glazing bars, curtains, and — when somebody is
      // home — the lit room itself, found by sending the view ray into a box
      float r1 = fract(vData.w);
      float r2 = hash11(r1 * 91.7 + seed * 13.0), r3 = hash11(r1 * 37.3 + seed * 71.0 + 3.0);
      float on = step(0.5, vData.w) * step(r1 * 0.97, mix(0.35, 1.0, uAlive));
      vec2 q = g * vec2(gw, gh);
      // which part of the quad is glass at all
      float hole = 1.0;
      vec2 panes = vec2(2.0, 3.0);
      float fr = 0.055;
      if (type > 0.5 && type < 1.5) { panes = vec2(max(1.0, floor(gw / 0.95)), 1.0); fr = 0.07; }
      else if (type < 2.5) panes = vec2(2.0, 4.0);
      else if (type < 3.5) {
        // a lancet: a pointed head
        panes = vec2(2.0, floor(gh / 0.55));
        float hy = max(q.y - (gh - gw * 0.95), 0.0) / (gw * 0.95);
        hole = step(abs(g.x - 0.5) * 2.0, 1.0 - hy * hy * 0.95);
        fr = 0.07;
      } else if (type < 4.5) panes = vec2(2.0, 2.0);
      else if (type < 5.5) {
        // a fanlight: half a wheel over the door
        vec2 c = vec2(q.x - gw * 0.5, q.y);
        float rr = min(gw * 0.5, gh * 1.02);
        hole = step(length(c), rr);
        float ang = atan(c.y, c.x);
        panes = vec2(1.0);
        float spoke = smoothstep(0.03, 0.02, abs(fract(ang / 0.5236 + 0.5) - 0.5) * 0.5236 * max(length(c), 0.05));
        hole *= 1.0 - max(spoke, smoothstep(0.035, 0.02, abs(length(c) - rr * 0.38)));
        fr = 0.045;
      } else {
        // a round window: a wheel of eight lights (a rose, a clock face)
        vec2 c = (g - 0.5) * vec2(gw, gh);
        float rr = min(gw, gh) * 0.5;
        float ang = atan(c.y, c.x);
        hole = step(length(c), rr * 0.97);
        float spoke = smoothstep(0.035, 0.022, abs(fract(ang / 0.7854 + 0.5) - 0.5) * 0.7854 * max(length(c), 0.05));
        hole *= 1.0 - max(spoke * step(rr * 0.25, length(c)), smoothstep(0.04, 0.025, abs(length(c) - rr * 0.25)));
        panes = vec2(1.0); fr = 0.0;
      }
      float edge = min(min(q.x, gw - q.x), min(q.y, gh - q.y));
      float frameM = 1.0 - smoothstep(fr * 0.8, fr, edge);
      vec2 pg = (q - fr) / (vec2(gw, gh) - 2.0 * fr) * panes;
      vec2 pd = (0.5 - abs(fract(pg) - 0.5)) * (vec2(gw, gh) - 2.0 * fr) / panes;   // metres to the nearest bar
      float bar = 1.0 - smoothstep(0.016, 0.024, min(pd.x + step(panes.x, 1.5) * 9.0, pd.y + step(panes.y, 1.5) * 9.0));
      // the two leaves of a casement meet in a thicker stile
      if (type < 0.5 || (type > 1.5 && type < 2.5)) bar = max(bar, 1.0 - smoothstep(0.028, 0.038, abs(q.x - gw * 0.5)));
      float wood = max(max(frameM, bar), 1.0 - hole);

      // the room
      vec3 Tn = gT / gw, Bn = gB / gh;
      vec3 rd = -V;
      vec3 dir = vec3(dot(rd, Tn), dot(rd, Bn), max(-dot(rd, N), 0.04));
      vec3 ro = vec3(q.x, q.y, 0.0);
      bool shopW = type > 0.5 && type < 1.5;
      bool tall = type > 1.5 && type < 2.5;
      float sideM = shopW ? 0.25 : 0.7 + 1.9 * r2;
      float xl = -sideM, xr = gw + sideM * (0.5 + r3);
      float yfl = shopW ? -0.5 : tall ? -0.03 : -0.95;
      float yc = gh + (shopW ? 0.25 : 0.55);
      float zb = shopW ? 1.5 + 0.9 * r3 : 2.6 + 2.4 * r3;
      float tx = dir.x > 0.0 ? (xr - ro.x) / dir.x : (xl - ro.x) / min(dir.x, -1e-4);
      float ty = dir.y > 0.0 ? (yc - ro.y) / dir.y : (yfl - ro.y) / min(dir.y, -1e-4);
      float tz = zb / dir.z;
      float tHit = min(tx, min(ty, tz));
      vec3 hp = ro + dir * tHit;
      vec3 paper = r2 < 0.3 ? vec3(0.66, 0.44, 0.18) : r2 < 0.55 ? vec3(0.58, 0.26, 0.20) : r2 < 0.8 ? vec3(0.38, 0.46, 0.30) : vec3(0.30, 0.40, 0.56);
      vec3 roomC;
      vec2 bwall = vec2((hp.x - xl) / (xr - xl), (hp.y - yfl) / (yc - yfl));
      if (tHit == ty) roomC = dir.y > 0.0 ? vec3(0.80, 0.70, 0.52) : vec3(0.30, 0.17, 0.08) * (0.8 + 0.4 * step(0.5, fract(hp.x * 3.0)));
      else if (tHit == tx) roomC = paper * 0.82 * (bwall.y < 0.3 ? 0.6 : 1.0);
      else {
        roomC = paper * (bwall.y < 0.3 ? 0.6 : 1.0);
        if (shopW) {
          // shelves of wares
          vec2 sc = bwall * vec2(floor(2.0 + (xr - xl) * 3.0), 4.0);
          float item = hash21(floor(sc) + seed * 91.0);
          vec2 sf = fract(sc);
          vec3 ware = item < 0.3 ? vec3(0.85, 0.30, 0.12) : item < 0.55 ? vec3(0.90, 0.75, 0.25) : item < 0.8 ? vec3(0.25, 0.50, 0.30) : vec3(0.30, 0.40, 0.75);
          float it = step(0.12, sf.x) * step(sf.x, 0.88) * step(0.06, sf.y) * step(sf.y, 0.45 + 0.4 * hash21(floor(sc) + 7.0));
          roomC = mix(roomC * 0.8, ware, it);
          roomC = mix(roomC, vec3(0.20, 0.11, 0.05), step(sf.y, 0.06));
        } else {
          // something on the far wall: a picture, a doorway
          float pic = step(abs(bwall.x - (0.28 + 0.44 * r1)), 0.10) * step(abs(bwall.y - 0.64), 0.11);
          roomC = mix(roomC, mix(vec3(0.10, 0.18, 0.40), vec3(0.85, 0.68, 0.22), step(0.5, fract(bwall.y * 11.0 + bwall.x * 7.0))), pic);
          float dr = step(abs(bwall.x - (0.80 - 0.56 * r3)), 0.085) * step(bwall.y, 0.74) * step(0.45, r1);
          roomC = mix(roomC, vec3(0.14, 0.08, 0.04), dr);
        }
      }
      // its lamp: hung from the ceiling, lighting the room from within
      vec3 lampP = vec3(mix(xl, xr, 0.32 + 0.36 * r1), yc - 0.6, zb * 0.5);
      float ld = length(hp - lampP);
      vec3 room = roomC * (0.30 + 2.6 / (1.0 + ld * ld * 0.6));
      float tl = clamp(dot(lampP - ro, dir) / dot(dir, dir), 0.0, tHit);
      float dl = length(ro + dir * tl - lampP);
      room += vec3(1.0, 0.86, 0.52) * exp(-dl * dl * 22.0) * 3.2;
      // somebody at home, crossing the room now and then
      if (r3 > 0.72 && !shopW) {
        float zs = zb * (0.28 + 0.35 * r2);
        vec3 sp = ro + dir * (zs / dir.z);
        float px = mix(xl + 0.4, xr - 0.4, 0.5 + 0.46 * sin(uTime * (0.07 + 0.08 * r1) + r1 * 40.0));
        vec2 f = vec2(sp.x - px, sp.y - yfl);
        float fig = step(length((f - vec2(0.0, 1.57)) / vec2(0.105, 0.125)), 1.0);
        fig = max(fig, step(abs(f.x), mix(0.16, 0.235, smoothstep(0.95, 1.38, f.y))) * step(f.y, 1.45));
        if (zs / dir.z < tHit) room = mix(room, vec3(0.05, 0.03, 0.025), fig);
      }
      // curtains, in the plane of the glass
      float cw = shopW ? 0.0 : r2 < 0.2 ? 0.52 : 0.08 + 0.24 * r3;
      float cur = (1.0 - smoothstep(cw - 0.012, cw, g.x)) + smoothstep(1.0 - cw, 1.0 - cw + 0.012, g.x);
      cur = min(cur, 1.0) * step(0.0005, cw);
      float fold = 0.70 + 0.30 * sin(q.x * 44.0 + sin(q.y * 4.0 + r1 * 9.0) * 1.6 + r1 * 30.0);
      vec3 curC = r1 < 0.4 ? vec3(0.95, 0.84, 0.62) : r1 < 0.7 ? vec3(0.82, 0.34, 0.20) : vec3(0.50, 0.64, 0.42);
      vec3 lightCol = mix(vec3(1.00, 0.78, 0.40), vec3(1.00, 0.58, 0.22), r2);
      if (type > 2.5 && type < 3.5) {
        // stained glass: lozenges of colour, lit from the nave
        vec2 lz = vec2(q.x + q.y, q.x - q.y) * 5.5;
        float hsh = hash21(floor(lz) + seed * 40.0);
        room = (hsh < 0.3 ? vec3(0.85, 0.20, 0.12) : hsh < 0.55 ? vec3(0.15, 0.35, 0.90) : hsh < 0.8 ? vec3(0.95, 0.75, 0.20) : vec3(0.20, 0.65, 0.40)) * 1.5;
        cur = 0.0; lightCol = vec3(1.0, 0.86, 0.62);
      } else if (type > 5.5 && r1 > 0.9) {
        // the clock face
        vec2 c = (g - 0.5) * 2.0;
        float ang = atan(c.x, c.y);
        float tick = smoothstep(0.035, 0.02, abs(fract(ang / 0.5236 + 0.5) - 0.5)) * step(0.72, length(c)) * step(length(c), 0.9);
        float h1 = smoothstep(0.05, 0.03, abs(c.x * 0.7071 + c.y * 0.7071)) * step(0.0, c.y - c.x) * step(length(c), 0.52);
        float h2 = smoothstep(0.04, 0.025, abs(c.x)) * step(0.0, c.y) * step(length(c), 0.74);
        room = mix(vec3(1.0, 0.94, 0.78) * 0.9, vec3(0.03), max(tick, max(h1, h2)));
        cur = 0.0; lightCol = vec3(1.0, 0.92, 0.74); wood = 1.0 - hole;
      }
      vec3 lit = mix(room, curC * fold * 1.15, cur * 0.93);
      float bright = (1.25 + 0.9 * r3) * (shopW ? 1.5 : 1.0) * (1.0 + 0.05 * sin(uTime * (2.0 + 5.0 * r1) + r2 * 40.0));
      // far off, the room melts back into a plain warm pane
      float farK = smoothstep(60.0, 150.0, vDist);
      lit = mix(lit, vec3(0.62, 0.52, 0.40) * (0.9 + 0.8 * r3), farK);
      emis = lit * lightCol * bright * on * (1.0 - wood);
      // dark glass keeps a ghost of its curtains and glints with the sky
      vec3 glass = mix(vec3(0.012, 0.020, 0.050), curC * 0.05, cur * 0.8);
      base = mix(glass, base, wood);
      gloss = mix(0.9, 0.25, wood); shin = mix(60.0, 20.0, wood);
      p = vec2(q.y, q.x); size = vec2(0.20, 0.045);
      valVar = 0.3; hueVar = 0.2; relief = mix(0.25, 0.6, wood);
      halo = 0.0;
    }
  } else if (kind == 14.0) {
    // ── figures (the rider, townsfolk): fine strokes that follow the form,
    // clean enough to read as a person, with the moon catching every edge
    p = vUv;
    size = vec2(0.105, 0.026) * clamp(vData.z, 0.3, 4.0);
    valVar = 0.26; hueVar = 0.14;
    gloss = 0.16; shin = 16.0; relief = 0.5; rim = 1.0;
#ifdef WALKER
    // townsfolk are met face to face: flesh and small things (fine strokes) are laid smooth and even,
    // and their cloth a little closer than a wall's — or a face reads as scales
    float skinK = smoothstep(0.9, 0.55, vData.z);
    valVar = mix(0.22, 0.10, skinK); hueVar = mix(0.12, 0.05, skinK);
    soft = mix(0.35, 0.9, skinK);
#endif
  } else {
    // small hard things (ironwork, the bicycle): finer strokes, quieter colour
    p = vUv;
    size = vec2(0.20, 0.05) * clamp(vData.z, 0.3, 4.0);
    valVar = 0.36; hueVar = 0.22;
    gloss = 0.45; shin = 30.0; relief = 0.5; rim = 0.4;
  }

  // ───────────── lay the dabs: three scales, overlapping, each a little askew
  // (a hand never lays two strokes parallel, and it is what stops walls reading as brickwork)
  p += (vec2(vnoise(p * (0.55 / size.x) + seed * 3.0), vnoise(p * (0.55 / size.x) + 7.3 + seed)) - 0.5) * size * vec2(0.9, 1.5);
  float lod = log2(max(vDist / uStrokeDist, 0.5));
  float l0 = floor(lod), lf = lod - l0;
  float cov1 = mix(0.34, 1.0, lf), cov2 = mix(0.0, 0.34, lf);
  relief *= mix(1.0, 0.45, smoothstep(50.0, 220.0, vDist));

  // The surface directions a step along / across the stroke corresponds to:
  // lets each dab be lit at its own centre and carry its own relief.
  vec2 jx = dFdx(p), jy = dFdy(p);
  float det = jx.x * jy.y - jy.x * jx.y;
  float inv = abs(det) > 1e-10 ? 1.0 / det : 0.0;
  vec3 Tu = (pdx * jy.y - pdy * jx.y) * inv;
  vec3 Tv = (pdy * jx.x - pdx * jy.x) * inv;
  float tl = dot(Tu, Tu) * dot(Tv, Tv);
  bool frame = tl > 1e-12 && tl < 1e12;

  vec3 dPix, sPix;
  shade(vPos, vWorld, N, N, V, shin, spill, dPix, sPix);
  vec3 under = mix(hueShift(base, -0.25) * 0.60, base * 0.94, soft) * dPix;

  // top-most strokes first; stop as soon as the surface is covered
  vec3 col = vec3(0.0);
  float alpha = 0.0;
  for (int k = 2; k >= 0; k--) {
    // every stroke scale ("level") has one fixed pattern in the world, so a
    // surface keeps its strokes as it moves through the distance bands
    float lev = l0 + float(k);
    float sc = exp2(lev);
    mat2 R = rot2((mod(lev, 3.0) - 1.0) * 0.19);
    vec2 pk = R * p + size * sc * 0.37 * mod(lev, 2.0);
    Dab d = dab(pk, size * sc, seed + lev * 0.37);
    float wgt = d.mask;
    if (k == 0) wgt *= 1.0 - smoothstep(0.72, 1.0, lf);                  // the finest scale bows out as the next takes over
    else wgt *= smoothstep(d.id2 - 0.04, d.id2 + 0.04, k == 1 ? cov1 : cov2);
    if (wgt < 0.003) continue;

    // where this dab's centre lies on the surface
    vec2 dp = (d.center - pk) * R;
    vec2 sxy = vec2(jy.y * dp.x - jy.x * dp.y, -jx.y * dp.x + jx.x * dp.y) * inv;
    vec3 dP = pdx * sxy.x + pdy * sxy.y;
    float lim = size.x * sc * 1.5;
    float dl = length(dP);
    if (dl > lim) dP *= lim / dl;

    // the ridge of paint: rounded across, falling away at the ends, furrowed by the bristles
    vec3 Nb = N;
    if (frame) {
      vec3 along = normalize(Tu * R[0][0] + Tv * R[1][0]);
      vec3 across = normalize(Tu * R[0][1] + Tv * R[1][1]);
      float furrow = sin(d.across * 7.0 + d.id * 40.0);
      Nb = normalize(N + (across * (d.across * 0.62 + furrow * 0.20) + along * ((d.along - 0.5) * 0.55)) * relief);
    }

    vec3 dDab, sDab;
    shade(vPos + dP, vWorld + dP, N, Nb, V, shin, spill, dDab, sDab);
    // partly its own light (pools break into strokes), partly the spot's (they still fall off smoothly)
    float own = k == 0 ? 0.50 : k == 1 ? 0.36 : 0.24;
    vec3 L = mix(dPix, dDab, own);

    vec3 a = base * (1.0 + (d.id - 0.5) * valVar);
    a = hueShift(a, (d.id2 - 0.5) * hueVar);
    if (d.id2 < accent) a = mix(a, accentCol, 0.65);
    // in lamplight colours run hot; in shadow they run to violet and blue
    float warmth = clamp(dot(L, vec3(0.5, 0.2, -0.6)), 0.0, 1.0);
    a = mix(a, a * vec3(1.22, 1.03, 0.78) + vec3(0.02, 0.0, 0.0), warmth * (0.4 + 0.6 * d.id));
    a = max(a, vec3(0.0));
    float bristle = vnoise(vec2(d.along * 3.0 + d.id * 17.0, d.across * 3.2 + d.id * 5.0));
    vec3 c = a * L * (0.88 + 0.22 * bristle) + sDab * gloss * (0.35 + 0.9 * d.id) * (0.35 + a * 2.2);

    col += (1.0 - alpha) * wgt * c;
    alpha += (1.0 - alpha) * wgt;
    if (alpha > 0.985) break;
  }
  col += (1.0 - alpha) * under;

  // the moon finds the edge of every rounded thing
  if (rim > 0.0) {
    float r = pow(1.0 - max(dot(N, V), 0.0), 2.6);
    col += (uMoonCol * (0.35 + 0.65 * max(dot(N, uMoonDir) * 0.5 + 0.5, 0.0)) + uAmbSky) * (r * rim * 0.9) * (base + 0.08);
  }

  // lit windows spill onto the wall around them and burn through the paint
  col += base * uWarmCol * halo * 1.6 * uGlow;
  vec3 e = emis * uGlow;

  // the village of the opening frame wakes with the painting
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(vec3(0.0), mix(vec3(l), col, mix(0.78, 1.06, uAlive)));

  float fogF = pow(smoothstep(uFogRange.x, uFogRange.y, vDist), 1.5);
  col = mix(col, uFogColor, fogF * 0.97);
  col += e * (1.0 - fogF * 0.86);
  gl_FragColor = vec4(col, 1.0);
}
`;function io(e,{dynamic:t=!1,walker:n=!1}={}){let r={uTime:e.uTime,uBend:e.uBend,uBendCenter:e.uBendCenter,uStrokeDist:e.uStrokeDist,uGlow:e.uGlow,uAlive:e.uAlive,uFogColor:e.uFogColor,uFogRange:e.uFogRange,uMoonDir:e.uMoonDir,uMoonCol:e.uMoonCol,uAmbSky:e.uAmbSky,uAmbGround:e.uAmbGround,uWarmCol:e.uWarmCol,uHeadPos:e.uHeadPos,uHeadDir:e.uHeadDir,uHeadPower:e.uHeadPower,tCanvas:e.tCanvas},i={};return t&&(r.uDynLamp={value:new te(0,-999,0,0)},i.DYNAMIC=1),n&&(i.WALKER=1,r.uHold={value:new te(0,0,0,0)}),new qe({vertexShader:no,fragmentShader:ro,uniforms:r,defines:i,side:2})}function ao(e){return new qe({vertexShader:`
      uniform float uBend;
      uniform vec3 uBendCenter;
      varying float vDist;
      invariant gl_Position;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec2 dxz = wp.xz - uBendCenter.xz;
        wp.y += uBend * dot(dxz, dxz);
        vec4 mv = viewMatrix * wp;
        vDist = length(mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
      precision highp float;
      uniform vec2 uFogRange;
      varying float vDist;
      void main() {
        if (vDist > uFogRange.y + 4.0) discard;
        gl_FragColor = vec4(0.0);
      }`,uniforms:{uBend:e.uBend,uBendCenter:e.uBendCenter,uFogRange:e.uFogRange},side:2,colorWrite:!1})}var oo=`
attribute vec2 aCorner;
attribute vec4 aGlow;      // size (m), seed, kind, intensity
attribute vec3 color;
uniform float uBend;
uniform vec3 uBendCenter;
uniform float uPixel;      // world size of one pixel at unit distance
uniform vec2 uFogRange;
uniform float uTime;
varying vec2 vCorner;
varying vec3 vColor;
varying vec3 vInfo;        // seed, kind, intensity
void main() {
  vec3 pos = position;
  float size = aGlow.x;
  float kind = aGlow.z;
  float life = 1.0;
  if (kind > 5.5) {
    // smoke: each puff rises from its chimney, leans with the wind, swells and thins
    float t = fract(uTime * 0.085 + aGlow.y);
    pos.y += t * 9.0;
    pos.x += t * t * 4.0 + sin(t * 9.0 + aGlow.y * 20.0) * 0.5;
    pos.z += sin(t * 6.0 + aGlow.y * 9.0) * 0.6;
    size *= 0.5 + t * 1.8;
    life = sin(t * 3.14159) * (1.0 - t * 0.4);
  }
  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vec2 dxz = wp.xz - uBendCenter.xz;
  wp.y += uBend * dot(dxz, dxz);
  vec4 mv = viewMatrix * wp;
  float dist = max(-mv.z, 0.1);
  // never smaller than a couple of pixels: far lights stay steady points
  float minSize = uPixel * dist * 2.2;
  float k = max(size, minSize);
  float dim = (size * size) / (k * k);
  mv.xy += aCorner * k;
  float fogF = pow(smoothstep(uFogRange.x, uFogRange.y, dist), 1.5);
  float inten = aGlow.w * mix(1.0, 0.30, fogF) * mix(dim, 1.0, 0.35) * step(dist, uFogRange.y + 4.0) * life;
  // far-window lights only take over once the painted panes are too small to read
  if (kind > 0.5 && kind < 1.5) inten *= smoothstep(110.0, 240.0, dist);
  // the guiding star is never dimmed by distance
  if (kind > 3.5 && kind < 4.5) inten = aGlow.w;
  vCorner = aCorner;
  vColor = color;
  vInfo = vec3(aGlow.y, kind, inten);
  gl_Position = projectionMatrix * mv;
}
`,so=`
precision highp float;
uniform float uTime;
uniform float uGlow;
uniform float uAlive;
varying vec2 vCorner;
varying vec3 vColor;
varying vec3 vInfo;
${ia}
const float TAU = 6.28318531;
void main() {
  float r = length(vCorner);
  if (r > 1.0) discard;
  float seed = vInfo.x, kind = vInfo.y;
  float a = 0.0;
  if (kind < 0.5) {
    // a lantern: hot heart, then a little star-halo of dashes, like the ones overhead
    float core = exp(-r * r * 26.0) * 1.6;
    float th = atan(vCorner.y, vCorner.x);
    float ring = floor(r * 5.0);
    float n = max(5.0, floor((ring + 0.5) * 4.4));
    float x = (th / TAU + 0.5) * n + hash11(ring + seed * 7.0) * 5.0 + uTime * 0.05 * (1.0 + ring * 0.3) * (seed > 0.5 ? 1.0 : -1.0);
    float fx = fract(x), fy = fract(r * 5.0);
    float dash = smoothstep(0.5, 0.30, abs(fx - 0.5)) * smoothstep(0.5, 0.22, abs(fy - 0.5));
    float fall = pow(max(1.0 - r, 0.0), 2.2);
    a = core + dash * fall * 0.55 * step(0.5, ring) + fall * 0.10;
  } else if (kind < 1.5 || (kind > 2.5 && kind < 3.5)) {
    // a far window, a festive bulb, a spark: just a soft point
    a = exp(-r * r * 5.0) - 0.0067;
  } else if (kind < 2.5) {
    // a stray star: pulsing, with turning rays
    float th = atan(vCorner.y, vCorner.x);
    float rays = pow(abs(cos(th * 2.0 + uTime * 0.6 + seed * 6.0)), 14.0);
    float pulse = 0.8 + 0.2 * sin(uTime * 3.0 + seed * 20.0);
    a = (exp(-r * r * 30.0) * 2.0 + rays * pow(max(1.0 - r, 0.0), 3.0) * 0.8 + pow(max(1.0 - r, 0.0), 3.0) * 0.25) * pulse;
  } else if (kind < 4.5) {
    // the guiding star over the steeple: a hot heart, four long rays, four
    // short ones, and haloes breathing outward like the stars on the canvas
    float th = atan(vCorner.y, vCorner.x);
    float fall = max(1.0 - r, 0.0);
    float rays = pow(abs(cos(th * 2.0)), 70.0) * pow(fall, 1.4);
    float rays2 = pow(abs(cos(th * 2.0 + 1.5708)), 110.0) * pow(max(1.0 - r * 1.9, 0.0), 2.0) * 0.6;
    rays2 += pow(abs(cos(th * 2.0 + 0.7854)), 90.0) * pow(max(1.0 - r * 2.4, 0.0), 2.0) * 0.5;
    float core = exp(-r * r * 120.0) * 3.0 + exp(-r * r * 16.0) * 0.55;
    float ring = smoothstep(0.5, 0.15, abs(fract(r * 5.0 - uTime * 0.22) - 0.5)) * pow(fall, 2.6) * 0.30;
    a = core + rays + rays2 + ring;
  } else if (kind < 5.5) {
    // a trail orb: a small sun with a breathing ring
    float ring = smoothstep(0.09, 0.0, abs(r - 0.60 - 0.06 * sin(uTime * 3.0 + seed * 9.0))) * 0.30;
    a = exp(-r * r * 20.0) * 1.7 + exp(-r * r * 4.0) * 0.30 + ring;
  } else {
    // smoke: a curl of pale strokes
    float th = atan(vCorner.y, vCorner.x);
    float curl = 0.5 + 0.5 * sin(th * 2.0 + r * 9.0 - uTime * 0.7 + seed * 30.0);
    a = pow(max(1.0 - r, 0.0), 1.6) * (0.35 + 0.65 * curl);
  }
  gl_FragColor = vec4(vColor * a * vInfo.z * uGlow * mix(0.25, 1.0, uAlive), 1.0);
}
`;function co(e){return new qe({vertexShader:oo,fragmentShader:so,uniforms:{uTime:e.uTime,uBend:e.uBend,uBendCenter:e.uBendCenter,uPixel:e.uPixel,uFogRange:e.uFogRange,uGlow:e.uGlow,uAlive:e.uAlive},blending:2,depthWrite:!1,transparent:!0})}var lo=new URLSearchParams(location.search),uo=typeof matchMedia==`function`&&matchMedia(`(hover: none), (pointer: coarse)`).matches,fo={touch:lo.has(`touch`)||(navigator.maxTouchPoints||0)>0&&uo,small:!1};fo.small=fo.touch&&Math.min(window.screen.width,window.screen.height)<820;var po=document.documentElement;po.classList.toggle(`touch`,fo.touch),fo.touch||window.addEventListener(`touchstart`,()=>{fo.touch=!0,po.classList.add(`touch`)},{once:!0,passive:!0});var mo=2,ho=fo.small?135:195,go=ho+80,_o=class{constructor(e,t,n,r){this.scene=e,this.paintMat=t,this.glowMat=n,this.walkerMat=r,this.W=new He(16384),this.chunks=new Map,this.queue=[],this.job=null,this.B=new gt(4e4),this.A=new gt(16384),this.N=new gt(65536),this.G=new E(1024),this.nearQueue=[],this.njob=null,this.nearAt={x:1e9,z:1e9},this.nearDirty=!1,this.group=new Te,e.add(this.group),this.focus={ci:1e9,cj:1e9},this.built=0,this._v=new W,this._c=new W}chunkCentre(e,t){return[(Xe(e*mo)+Xe(e*mo+mo))/2,(Ne(t*mo)+Ne(t*mo+mo))/2]}collectLamps(e,t,n,r){let i=e*mo,a=t*mo,o=[],s=(e,t)=>o.push({wx:ft(e.x,e.z)-n,wy:e.y,wz:wt(e.x,e.z)-r,power:t}),c=e=>{for(let t of e.lamps)s(t,1);if(e.arch){let t=(e.arch.a0+e.arch.a1)/2;s(e.axis===`x`?{x:e.c,z:t,y:e.arch.under+.35}:{x:t,z:e.c,y:e.arch.under+.35},.9)}};for(let e=i;e<=i+mo;e++)for(let t=a-1;t<=a+mo;t++)c(Se(`x`,e,t));for(let e=a;e<=a+mo;e++)for(let t=i-1;t<=i+mo;t++)c(Se(`z`,t,e));for(let e=i-1;e<=i+mo;e++)for(let t=a-1;t<=a+mo;t++)for(let n of ge(e,t).lamps)s(n,n.power??1.1);return o}startJob(e,t){let[n,r]=this.chunkCentre(e,t),i=ft(n,r),a=wt(n,r);this.B.reset(i,a,n,r),this.A.reset(i,a,n,r),this.G.reset(i,a);let o=this.collectLamps(e,t,i,a);this.B.setLamps(o),this.A.setLamps(o),this.job={ci:e,cj:t,ox:i,oz:a,gx:n,gz:r,step:0,lamps:o}}stepJob(){let e=this.job,t=this.B,r=this.G,i=e.step++;if(i<4){let a=e.ci*mo+i%mo,o=e.cj*mo+Math.floor(i/mo),s=ge(a,o);for(let e of s.houses)oe(this.A,r,e,s);Ze(this.A,r,s),re(t,r,s);for(let e of s.trees)ce(t,e,s);for(let e of s.lamps)m(t,r,e,null);C(t,r,s);for(let e of[Se(`x`,a,o),Se(`z`,a,o)]){for(let n of e.lamps)m(t,r,n,e);n(t,r,e),j(r,e)}return N(t,a,o),!1}let a=this.solid(t,e.ox,e.oz),o=this.A.nv>0?this.solid(this.A,e.ox,e.oz):null,s=null;r.n>0&&(s=new St(r.build(),this.glowMat),s.position.copy(a.position),s.frustumCulled=!1,s.matrixAutoUpdate=!1,s.updateMatrix(),s.renderOrder=60);let c={ci:e.ci,cj:e.cj,x:e.ox,z:e.oz,gx:e.gx,gz:e.gz,paint:a,arch:o,glow:s,folk:null,near:[],nearReady:!1,lamps:e.lamps,y:(t.minY+t.maxY)/2};return this.group.add(a),o&&this.group.add(o),this.nearDirty=!0,s&&this.group.add(s),this.chunks.set(e.ci*65536+e.cj,c),this.job=null,this.built++,!0}solid(e,t,n){let r=new St(e.build(),this.paintMat);return r.position.set(t,0,n),r.frustumCulled=!1,r.matrixAutoUpdate=!1,r.updateMatrix(),r.layers.enable(1),r}dropNear(e){for(let t of e.near)this.group.remove(t),t.geometry.dispose();e.folk&&=(this.group.remove(e.folk),e.folk.geometry.dispose(),null),e.people=null,e.near=[],e.nearReady=!1,this.njob&&this.njob.chunk===e&&(this.njob=null)}updateNear(e,t){let n=[];for(let r of this.chunks.values()){let i=Math.hypot(r.gx-e,r.gz-t);i<ho?!r.nearReady&&!(this.njob&&this.njob.chunk===r)&&n.push({c:r,d:i}):i>go&&(r.nearReady||r.near.length||this.njob&&this.njob.chunk===r)&&this.dropNear(r)}n.sort((e,t)=>e.d-t.d),this.nearQueue=n.map(e=>e.c)}stepNear(e){let t=this.njob,n=this.N,r=this.W,i=t.chunk;t.k===0&&t.fresh&&(r.reset(i.x,i.z,i.gx,i.gz),r.setLamps(i.lamps),r.census=[]),t.fresh&&=(n.reset(i.x,i.z,i.gx,i.gz),n.setLamps(i.lamps),!1);let o=i.ci*mo+t.k%mo,s=i.cj*mo+Math.floor(t.k/mo),c=ge(o,s);for(;t.hi<c.houses.length;)if(Ge(n,c.houses[t.hi++],c),performance.now()>e)return;if(rt(n,c),a(n,c),n.nv>0){let e=this.solid(n,i.x,i.z);e.visible=!1,i.near.push(e),this.group.add(e)}for(let e of[Se(`x`,o,s),Se(`z`,o,s)])kt(r,e);if(ke(r,c),t.k++,t.hi=0,t.fresh=!0,t.k>=4){if(r.nv>0){let e=new St(r.build(),this.walkerMat);e.position.set(i.x,0,i.z),e.frustumCulled=!1,e.matrixAutoUpdate=!1,e.updateMatrix(),i.folk=e,this.group.add(e)}i.people=r.census||[],r.census=null,i.nearReady=!0,this.njob=null}}retarget(e,t){(this.nearDirty||Math.hypot(e-this.nearAt.x,t-this.nearAt.z)>14)&&(this.nearAt.x=e,this.nearAt.z=t,this.nearDirty=!1,this.updateNear(e,t));let n=Math.floor(I(e)/mo),r=Math.floor(xt(t)/mo);if(n===this.focus.ci&&r===this.focus.cj)return;this.focus={ci:n,cj:r};let i=Math.ceil((fe.viewRadius+60)/(fe.pitch*mo))+1,a=[],o=new Set,s=fe.viewRadius+fe.pitch*mo*.72;for(let c=n-i;c<=n+i;c++)for(let n=r-i;n<=r+i;n++){let[r,i]=this.chunkCentre(c,n),l=Math.hypot(r-e,i-t);if(l>s)continue;let u=c*65536+n;o.add(u),!this.chunks.has(u)&&!(this.job&&this.job.ci===c&&this.job.cj===n)&&a.push({ci:c,cj:n,d:l})}a.sort((e,t)=>e.d-t.d),this.queue=a;for(let[n,r]of this.chunks){if(o.has(n))continue;let[i,a]=this.chunkCentre(r.ci,r.cj);Math.hypot(i-e,a-t)<s+150||(this.group.remove(r.paint),r.paint.geometry.dispose(),r.arch&&(this.group.remove(r.arch),r.arch.geometry.dispose()),this.dropNear(r),r.glow&&(this.group.remove(r.glow),r.glow.geometry.dispose()),this.chunks.delete(n))}}work(e){let t=performance.now()+e;do{if(!this.job){let e=this.queue.shift();if(!e)break;if(this.chunks.has(e.ci*65536+e.cj))continue;this.startJob(e.ci,e.cj)}this.stepJob()}while(performance.now()<t);for(;performance.now()<t;){if(!this.njob){let e=this.nearQueue.shift();if(!e)break;if(e.nearReady||this.chunks.get(e.ci*65536+e.cj)!==e)continue;this.njob={chunk:e,k:0,hi:0,fresh:!0}}this.stepNear(t)}}get pending(){return this.queue.length+ +!!this.job+this.nearQueue.length+ +!!this.njob}cull(e){let t=e.getWorldDirection(this._v),n=Math.hypot(t.x,t.z),r=n<.5,i=t.x/(n||1),a=t.z/(n||1),o=fe.pitch*mo*.8,s=!r,c=1;for(let t=0;s&&t<4;t++){let n=this._c.set(t&1?1:-1,t&2?1:-1,.5).applyMatrix4(e.projectionMatrixInverse).transformDirection(e.matrixWorld),r=Math.hypot(n.x,n.z),o=r>1e-4?(n.x*i+n.z*a)/r:0;o<.2?s=!1:o<c&&(c=o)}let l=Math.sqrt(Math.max(0,1-c*c));for(let t of this.chunks.values()){let n=t.x-e.position.x,u=t.z-e.position.z,d=n*i+u*a,f=r||d>-o;f&&s&&Math.abs(n*a-u*i)*c-d*l>o&&(f=!1),t.paint.visible=f,t.arch&&(t.arch.visible=f&&!t.nearReady);for(let e=0;e<t.near.length;e++)t.near[e].visible=f&&t.nearReady;t.glow&&(t.glow.visible=f),t.folk&&(t.folk.visible=f)}}personAt(e,t,n){this.held&&this.held.p===e&&(t=this.held.t);let r=0;if(e.mode===1){let n=Math.max(Math.hypot(e.bx-e.ax,e.bz-e.az),.001)/Math.max(e.speed,.05),i=e.p1,a=Math.abs(e.p2),o=2*n+i+a,s=t/o+e.phase,c=(s-Math.floor(s))*o;r=c<n?c/n:c<n+i?1:c<2*n+i?1-(c-n-i)/n:0}return n.x=e.ax+(e.bx-e.ax)*r,n.y=e.ay+(e.by-e.ay)*r,n.z=e.az+(e.bz-e.az)*r,n}hold(e,t){this.held=e?{p:e,t}:null;let n=this.walkerMat.uniforms.uHold.value;e&&((n.x!==e.ax||n.y!==e.az)&&(n.w=0),n.x=e.ax,n.y=e.az,n.z=t)}easeHold(e){let t=this.walkerMat.uniforms.uHold.value,n=+!!this.held;t.w+=(n-t.w)*(1-Math.exp(-(n?5:3.5)*e)),!n&&t.w<.012&&(t.w=0)}personNear(e,t,n,r,i,a=null){let o=null,s=r,c=this._at||={x:0,y:0,z:0};for(let l of this.chunks.values())if(!(!l.people||Math.hypot(l.x-e,l.z-t)>140))for(let u=0;u<l.people.length;u++){let d=l.people[u];if(!d.kind||d.kind===`boy`||d.kind===`girl`||d.mode===4||d.mode===9||(this.personAt(d,i,c),Math.abs(c.y-n)>2.5))continue;let f=Math.hypot(c.x-e,c.z-t);if(f>=r)continue;let p=`${l.ci}:${l.cj}:${u}`;(!a||a(p,c,f))&&f<s&&(s=f,o={p:d,cid:p,d:f})}return o}nearestLamp(e,t,n){let r=I(e),i=xt(t),a=null,o=784,s=n=>{let r=(n.x-e)*(n.x-e)+(n.z-t)*(n.z-t);r<o&&(o=r,a=n)};for(let e=r;e<=r+1;e++)for(let t of Se(`x`,e,i).lamps)s(t);for(let e=i;e<=i+1;e++)for(let t of Se(`z`,r,e).lamps)s(t);for(let e of ge(r,i).lamps)s(e);return a?(n.set(ft(a.x,a.z),a.y,wt(a.x,a.z),1),n):(n.set(0,-999,0,0),n)}},vo=e=>e<=.04045?e/12.92:((e+.055)/1.055)**2.4,yo=e=>[vo((e>>16&255)/255),vo((e>>8&255)/255),vo((e&255)/255)],J={frame:yo(1845842),tire:yo(1053468),rim:yo(9214648),metal:yo(10134710),saddle:yo(3810326),smock:yo(3103936),smockLight:yo(6129372),smockDark:yo(2047884),trousers:yo(10122294),skin:yo(14855042),skinShade:yo(13208166),eye:yo(1710626),eyeWhite:yo(14275782),iris:yo(4157306),hat:yo(15582546),hatShade:yo(13081140),band:yo(2371674),boot:yo(3810324),hair:yo(12870186),leather:yo(8014372),leatherDark:yo(4860948),scarf:yo(14699052),wicker:yo(12093770),petal:yo(15909424),seed:yo(4860944),stem:yo(4090410),feather:yo(16054015),featherGold:yo(16770720),featherBlue:yo(12112127)},bo=J,xo=.35,So=[-.52,xo],Co=[.56,xo],wo=[0,.3],To=[-.19,.87],Eo=[.38,.91],Do=[.43,.66],Oo=.17,ko=.13,Ao=[-.17,.985],jo=.44,Mo=.47,No=[Eo[0]-.075,Eo[1]+.135,.285],Po=(e,t,n,r=1)=>e.color(t).data(Ee.FIGURE,n,r,0);function Fo(){let e=new gt(4096);e.reset(0,0,0,0);let t=.32599999999999996,n=.024;e.color(J.tire).data(Ee.PLAIN,.2,.45,0);let r=[];for(let i=0;i<=26;i++){let a=i/26*Math.PI*2,o=Math.cos(a),s=Math.sin(a),c=[];for(let r=0;r<=7;r++){let i=r/7*Math.PI*2,l=Math.cos(i),u=Math.sin(i);c.push(e.vert(o*(t+l*n),s*(t+l*n),u*n,o*l,s*l,u,a*t,i*n,1))}r.push(c)}for(let t=0;t<26;t++)for(let n=0;n<7;n++){let i=r[t][n],a=r[t][n+1],o=r[t+1][n+1],s=r[t+1][n];e.tri3(i,a,o),e.tri3(i,o,s)}e.color(J.rim).data(Ee.PLAIN,.6,.4,0);for(let t=0;t<16;t++){let n=t/16*Math.PI*2;d(e,0,0,t%2?.022:-.022,Math.cos(n)*.30599999999999994,Math.sin(n)*.30599999999999994,0,.008,t*.1)}return e.color(J.metal),d(e,0,0,-.05,0,0,.05,.05),e.build()}function Io(){let e=new gt(4096);e.reset(0,0,0,0),e.color(J.frame).data(Ee.PLAIN,.4,.5,0);let t=.034;d(e,wo[0],wo[1],0,To[0],To[1],0,t),d(e,To[0],To[1]-.04,0,Eo[0],Eo[1]-.03,0,t),d(e,wo[0],wo[1],0,Do[0],Do[1],0,t*1.1);for(let n of[-.045,.045])d(e,wo[0],wo[1],n*.6,So[0],So[1],n,t*.7),d(e,To[0],To[1]-.06,n*.5,So[0],So[1],n,t*.65);d(e,To[0],To[1],0,To[0]-.012,To[1]+.035,0,.026),e.color(J.saddle),Pe(e,To[0]-.055,To[1]+.048,0,.088,.03,.076,10,5),Pe(e,To[0]+.055,To[1]+.044,0,.085,.024,.036,8,5),e.color(J.frame,.8);for(let[t,n,r]of[[So[0],.1,.98],[Co[0],.22,.86]])for(let i=0;i<7;i++){let a=Math.PI*(n+(r-n)*i/7),o=Math.PI*(n+(r-n)*(i+1)/7),s=.378;d(e,t+Math.cos(a)*s,xo+Math.sin(a)*s,0,t+Math.cos(o)*s,xo+Math.sin(o)*s,0,.052)}return e.color(J.frame,1.3),d(e,wo[0]+.02,wo[1]+.07,.065,So[0]+.06,So[1]+.05,.065,.045),e.color(J.metal,.7),d(e,To[0]-.02,To[1]-.12,0,So[0]-.2,So[1]+.4,0,.02),d(e,So[0]-.2,So[1]+.4,-.07,So[0]-.2,So[1]+.4,.07,.02),d(e,So[0],So[1],.05,So[0]-.2,So[1]+.4,.07,.014),d(e,So[0],So[1],-.05,So[0]-.2,So[1]+.4,-.07,.014),e.rgb(1,.12,.05).data(Ee.GLOW,0,4.5,0),Lt(e,So[0]-.385,So[1]+.18,0,.03,.05,.05),e.build()}function Lo(){let e=new gt(4096);e.reset(0,0,0,0),e.color(J.frame).data(Ee.PLAIN,.4,.5,0);let t=Eo[0],n=Eo[1],r=Do[0]-t,i=Do[1]-n,a=Co[0]-t,o=Co[1]-n;d(e,0,.02,0,r,i,0,.046);for(let t of[-.05,.05])d(e,r,i,t*.7,a,o,t,.028);e.color(J.metal),d(e,0,0,0,-.03,.13,0,.026);for(let t of[-1,1])d(e,-.03,.13,0,-.01,.15,t*.17,.022),d(e,-.01,.15,t*.17,-.075,.135,t*.275,.022),e.color(J.saddle),d(e,-.075,.135,t*.275,-.15,.13,t*.29,.032),e.color(J.metal);Pe(e,.1,-.12,0,.05,.045,.045,8,5),e.rgb(1,.86,.55).data(Ee.GLOW,0,7,0),Lt(e,.148,-.12,0,.012,.06,.06),e.color(J.wicker).data(Ee.PLAIN,.7,.35,0);let s=(e,t,n)=>({c:[.17,e,0],u:[0,0,t],v:[n,0,0],sq:2.2});pe(e,[s(-.07,.1,.075),s(0,.125,.09),s(.085,.145,.105)],12,!0,!1),e.color(J.wicker,.55),pe(e,[s(.08,.135,.095),s(.02,.118,.082)],12,!1,!0);for(let[t,n,r,i]of[[.15,.25,-.055,.075],[.215,.215,.05,.068],[.115,.3,.025,.06]]){e.color(J.stem).data(Ee.PLAIN,.3,.3,0),d(e,.17,.04,r*.4,t,n,r,.014),Po(e,J.petal,.9+r,.6);for(let a=0;a<9;a++){let o=a/9*Math.PI*2,s=e.pl(t,n+.012,r),c=e.pl(t+Math.cos(o-.3)*i*.5,n+.01,r+Math.sin(o-.3)*i*.5),l=e.pl(t+Math.cos(o)*i,n-.008,r+Math.sin(o)*i),u=e.pl(t+Math.cos(o+.3)*i*.5,n+.01,r+Math.sin(o+.3)*i*.5);e.quad(s,c,l,u,0,0,i,i)}e.color(J.seed),Pe(e,t,n+.012,r,i*.42,.016,i*.42,8,4)}return e.build()}function Ro(){let e=new gt(1024);e.reset(0,0,0,0),e.color(J.metal).data(Ee.PLAIN,.5,.4,0),d(e,0,0,-.08,0,0,.08,.03),d(e,0,0,.08,Oo,0,.09,.022),d(e,0,0,-.08,-.17,0,-.09,.022);for(let t=0;t<10;t++){let n=t/10*Math.PI*2,r=(t+1)/10*Math.PI*2;d(e,Math.cos(n)*.085,Math.sin(n)*.085,.06,Math.cos(r)*.085,Math.sin(r)*.085,.06,.012)}return e.build()}var zo=(()=>{let e=[.14,1.47],t=[e[0]-Ao[0],e[1]-Ao[1]],n=Math.hypot(t[0],t[1]);return{d:[t[0]/n,t[1]/n],len:n,top:e}})(),Bo=[zo.top[0]+.075,zo.top[1]+.185],Vo=[.097,1.397,.208];function Ho(e,t=0){let n=zo.d,r=[n[1],-n[0]],i=-.032*Math.sin(Math.PI*Math.min(Math.max(e,0),1));return[Ao[0]+n[0]*zo.len*e+r[0]*(t+i),Ao[1]+n[1]*zo.len*e+r[1]*(t+i)]}function Uo(){let e=new gt(8192);e.reset(0,0,0,0);let t=zo.d,n=[t[1],-t[0],0],r=(e,t,r,i,a=1)=>{let o=Ho(e);return{c:[o[0],o[1],0],u:[0,0,t],v:[n[0]*r,n[1]*r,0],back:i/r,sq:a}},i=(e,t,n,r,i,a)=>({c:[e,t,0],u:[0,0,n],v:[Math.cos(a)*r,Math.sin(a)*r,0],back:i/r,sq:1.2});Po(e,J.smock,.7),pe(e,[i(-.19,.988,.196,.128,.126,.56),i(-.19,.995,.224,.152,.146,.56),i(-.16,1.045,.22,.138,.142,.25),r(.13,.186,.122,.132),r(.24,.166,.118,.128),r(.45,.186,.132,.142),r(.66,.206,.138,.152,1.1),r(.84,.226,.118,.136,1.25),r(.93,.176,.094,.108),r(.99,.08,.07,.074),r(1.03,.062,.058,.06)],16,!1,!1,(e,t)=>.86+.14*Math.sin(t*Math.PI*2)+(e<4?-.08:0)+(e<1?-.16:0)),Po(e,J.smockLight,.3),pe(e,[r(.975,.094,.084,.088),r(1.045,.074,.07,.072)],14,!1,!1);for(let t of[-1,1])Po(e,J.smock,.75+t*.08),Pe(e,Vo[0],Vo[1],t*Vo[2],.082,.078,.078,10,6);return e.build()}function Wo(e){let t=new gt(2048);if(t.reset(0,0,0,0),Po(t,J.leatherDark,.2,.8),!e){for(let e of[-.142,.132]){let n=Ho(.87,e),r=Ho(.12,e*.92);Nt(t,[n[0],n[1],.15],[r[0],r[1],-.165],[[0,.021],[1,.021]],6)}return t.build()}let n=[[0,.215,.14,.142],[.13,.186,.122,.132],[.24,.166,.118,.128],[.45,.186,.132,.142],[.66,.206,.138,.152],[.84,.226,.118,.136],[.93,.176,.094,.108],[.99,.08,.07,.074],[1.03,.062,.058,.06]],r=e=>{let t=0;for(;t<n.length-2&&e>n[t+1][0];)t++;let r=n[t],i=n[t+1],a=Math.min(1,Math.max(0,(e-r[0])/(i[0]-r[0])));return[r[1]+(i[1]-r[1])*a,r[2]+(i[2]-r[2])*a,r[3]+(i[3]-r[3])*a]},i=.026,a=[];for(let e=0;e<=40;e++){let t=e/40*Math.PI*2,n=Math.cos(t),o=Math.sin(t),s=.15+.835*((1+n)/2)**.9,[c,l,u]=r(s),d=Ho(s,(o>0?l:u)*o+i*o);a.push([d[0],d[1],(c+i)*n])}for(let e=0;e<40;e++)Nt(t,a[e],a[e+1],[[0,.019],[1,.019]],6);return t.build()}var Go=Ho(.3);function Ko(){let e=new gt(1024);e.reset(0,0,0,0);let t=zo.d,n=[t[1],-t[0],0];Po(e,J.leather,.45,.8);let r=Ho(.3,-.165),i=(e,i,a)=>({c:[r[0]+t[0]*e,r[1]+t[1]*e,-.035],u:[0,0,i],v:[n[0]*a,n[1]*a,0],sq:2.2});return pe(e,[i(-.13,.115,.045),i(-.06,.13,.058),i(.07,.13,.058),i(.125,.118,.046)],12,!0,!0),Po(e,J.leatherDark,.2,.8),pe(e,[i(.035,.134,.062),i(.13,.122,.05)],12,!1,!1),e.build()}var qo=Ho(-.105),Jo=-Math.atan2(zo.d[0],zo.d[1]);function Yo(){let e=new gt(512);e.reset(0,0,0,0);let t=zo.d,n=Math.cos(-Jo),r=Math.sin(-Jo),i=e=>[e[0]*n-e[1]*r,e[0]*r+e[1]*n,e[2]],a=(e,t,n,r,a)=>({c:i([e-qo[0],t-qo[1],0]),u:[0,0,n],v:i(r),back:a,sq:1.2});return Po(e,J.smock,.7),pe(e,[a(Ao[0]-.045,Ao[1]-.06,.17,[.1,-.027,0],.85),a(qo[0],qo[1],.192,[t[1]*.132,-t[0]*.132,0],.118/.132)],16,!1,!1,(e,t)=>.86+.14*Math.sin(t*Math.PI*2)-(e<1?.24:.08)),e.build()}var Xo=.27,Zo=.25,Qo=.18;function $o(e){let t=new gt(1024);return t.reset(0,0,0,0),Po(t,J.smock,e),Nt(t,[0,0,0],[Xo,0,0],[[0,.074],[.45,.068],[1,.058]],10),t.build()}function es(e){let t=new gt(1024);return t.reset(0,0,0,0),Po(t,J.smock,e),Pe(t,0,0,0,.06,.06,.06,8,5),Nt(t,[0,0,0],[.135,0,0],[[0,.058],[.5,.053],[1,.046]],10),Po(t,J.smockLight,.2),Nt(t,[.125,0,0],[.15,0,0],[[0,.05],[1,.05]],9),Po(t,J.skin,.3,.6),Nt(t,[.15,0,0],[.176,0,0],[[0,.034],[1,.035]],8),t.build()}function ts(e,t){let n=new gt(2048);n.reset(0,0,0,0);let r=1.22,i=[-.037*r,-.0125*r,.0125*r,.037*r];if(Po(n,J.skin,.3,.6),Pe(n,.004,0,0,.037,.035,.037,8,5),t){Pe(n,.052*r,0,0,.05*r,.019*r,.05*r,10,6);let t=e>0?[.078,.092,.086,.066]:[.066,.086,.092,.078];for(let e=0;e<4;e++)Nt(n,[.088*r,.001,i[e]],[(.088+t[e])*r,-.013*r,i[e]*1.1],[[0,.0138*r],[1,.0112*r]],6);Nt(n,[.022*r,-.004,-e*.044*r],[.078*r,-.01*r,-e*.094*r],[[0,.0158*r],[1,.0125*r]],6)}else{Pe(n,.047*r,.005,0,.05*r,.028*r,.05*r,10,6);for(let e=0;e<4;e++)Pe(n,.09*r,.002,i[e],.017*r,.017*r,.0135*r,6,4),Nt(n,[.094*r,-.004*r,i[e]],[.086*r,-.05*r,i[e]],[[0,.0138*r],[1,.013*r]],6),Nt(n,[.086*r,-.052*r,i[e]],[.046*r,-.058*r,i[e]],[[0,.013*r],[1,.012*r]],6);Nt(n,[.02*r,-.014*r,-e*.05*r],[.082*r,-.04*r,-e*.028*r],[[0,.0162*r],[1,.013*r]],6)}return n.build()}function ns(){let e=new gt(8192);e.reset(0,0,0,0);let t=Bo[0]-zo.top[0],n=Bo[1]-zo.top[1];Po(e,J.skin,.3,.7),Nt(e,[-.004,-.03,0],[t-.03,n-.09,0],[[0,.054],[1,.048]],10),Pe(e,t,n,0,.106,.12,.097,14,10),Pe(e,t+.034,n-.058,0,.074,.07,.079,12,8),Po(e,J.skinShade,.5,.6),Pe(e,t+.108,n-.022,0,.026,.032,.02,8,5);for(let r of[-1,1])Pe(e,t-.006,n-.012,r*.097,.018,.032,.014,6,5);Pe(e,t+.086,n+.034,0,.022,.013,.066,10,5);for(let r of[-1,1]){let i=t+.0935,a=n+.01,o=r*.043;e.color(J.eyeWhite).data(Ee.PLAIN,.1,.3,0),Pe(e,i,a,o,.0065,.0072,.0135,8,5),e.color(J.iris).data(Ee.PLAIN,.1,.3,0),Pe(e,i+.0035,a-2e-4,o-r*3e-4,.0048,.0066,.0068,7,5),e.color(J.eye).data(Ee.PLAIN,.1,.3,0),Pe(e,i+.0066,a-2e-4,o-r*3e-4,.0026,.0034,.0034,6,4),Po(e,J.skin,.3,.7),Pe(e,i-5e-4,a+.0076,o,.0088,.0048,.0152,8,4),Pe(e,i-.001,a-.0072,o,.0068,.0024,.0124,8,3)}Po(e,J.hair,.55,.7);for(let r of[-1,1])Pe(e,t+.097,n+.0325,r*.041,.016,.0058,.023,6,3);Pe(e,t+.05,n-.086,0,.074,.078,.084,12,8),Pe(e,t+.098,n-.05,0,.026,.016,.05,8,4),Pe(e,t-.04,n-.01,0,.082,.098,.099,12,8);for(let r of[-1,1])Pe(e,t+.02,n-.04,r*.088,.03,.05,.02,6,5);let r=n+.064,i=.07;Po(e,J.hat,.9,.9),c(e,[t+.01,r,0],.098,.255,22,.034,i,1),Po(e,J.hatShade,.6,.9),c(e,[t+.01,r-.006,0],.098,.25,22,.034,i,.7),Po(e,J.hat,.9,.9);let a=(e,n)=>({c:[t+.01,r+e,0],u:[n,-n*i,0],v:[0,0,n*.95]});pe(e,[a(-.004,.106),a(.05,.102),a(.09,.092),a(.106,.064)],16,!1,!0),Po(e,J.band,.2,.8),pe(e,[a(.002,.109),a(.036,.107)],16,!1,!1),Po(e,J.scarf,.8,.8);let o=(e,t)=>({c:[.012+e*.3,e-.012,0],u:[t,0,0],v:[0,0,t*1.05]});return pe(e,[o(-.03,.094),o(0,.088),o(.035,.078),o(.055,.066)],14,!1,!1),e.build()}function rs(e){let t=new gt(1024);t.reset(0,0,0,0),Po(t,J.trousers,e);let n=.074,r=[...[90,70,50,30,12].map(e=>{let t=e*Math.PI/180;return[-.094*Math.sin(t),.097*Math.cos(t),Math.sin(t)]}),[0,.097,0],[.06,.097,0],[jo*.3,.095,0],[jo*.75,.082,0],[jo,n,0],[.4733,n*.82,-.5],[.4992,n*.42,-.85]],i=[],a=0;r.forEach(([e,n,o],s)=>{s>0&&(a+=Math.hypot(e-r[s-1][0],n-r[s-1][1]));let c=Math.sqrt(1-o*o),l=[];for(let r=0;r<=12;r++){let i=r/12*Math.PI*2,s=Math.cos(i),u=Math.sin(i);l.push(t.vert(e,s*n,u*n,-o,s*c,u*c,r/12*Math.PI*2*Math.max(n,e<0?.097:0),a,1))}i.push(l)});for(let e=0;e<i.length-1;e++)for(let n=0;n<12;n++){let r=i[e][n],a=i[e][n+1],o=i[e+1][n+1],s=i[e+1][n];t.tri3(r,a,o),t.tri3(r,o,s)}let o=r.length-1,s=t.vert(r[o][0],0,0,1,0,0,0,a,1);for(let e=0;e<12;e++)t.tri3(s,i[o][e],i[o][e+1]);return t.build()}function is(e){let t=new gt(1024);return t.reset(0,0,0,0),Po(t,J.trousers,e),Pe(t,0,0,0,.078,.078,.076,10,6),Nt(t,[0,0,0],[.39999999999999997,0,0],[[0,.072],[.3,.076],[.72,.058],[1,.05]],12),Po(t,J.boot,.2,.7),Nt(t,[.35,0,0],[Mo,0,0],[[0,.056],[1,.052]],10),t.build()}function as(e=!0){let t=new gt(1024);t.reset(0,0,0,0),Po(t,J.boot,.2,.7);let n=(e,t,n,r)=>({c:[e,r,0],u:[0,0,t],v:[0,n,0],sq:1.5,back:.75});return pe(t,[n(-.085,.034,.04,0),n(-.05,.048,.056,.004),n(.02,.052,.052,0),n(.09,.058,.042,-.006),n(.16,.052,.034,-.012),n(.205,.034,.024,-.016)],12,!0,!0,(e,t)=>t>.5?.6:1),e&&(t.color(J.metal).data(Ee.PLAIN,.3,.3,0),Lt(t,.03,-.052,0,.095,.02,.105)),t.build()}function os(){let e=new gt(256);return e.reset(0,0,0,0),e.color(J.metal).data(Ee.PLAIN,.3,.3,0),Lt(e,Oo,0,.135,.095,.02,.105),Lt(e,-.17,0,-.135,.095,.02,.105),e.build()}var ss=10;function cs(){let e=new gt(256);e.reset(0,0,0,0),Po(e,J.scarf,.8,.8);for(let t=0;t<2;t++){let t=e.nv;for(let t=0;t<=ss;t++)e.vert(0,0,0,0,0,1,0,t*.085,1-t/ss*.25),e.vert(0,0,0,0,0,1,.075,t*.085,1-t/ss*.25);for(let n=0;n<ss;n++){let r=t+n*2;e.tri3(r,r+1,r+3),e.tri3(r,r+3,r+2)}}let t=e.build();return t.getAttribute(`position`).setUsage(xe),t}function ls(e){let t=new gt(4096);t.reset(0,0,0,0);let n=e?-1:1,r=(e,r,i)=>t.pl(e,r,i*n),i=e=>e<.42?[e/.42*-.06,e/.42*.16,e/.42*.62]:[-.06-.2*((e-.42)/.58),.16-.1*((e-.42)/.58),.62+.86*((e-.42)/.58)];Po(t,J.feather,.5,1.2),Nt(t,[0,0,0],[-.06,.16,.62*n],[[0,.045],[1,.034]],8),Nt(t,[-.06,.16,.62*n],[-.26,.06,1.48*n],[[0,.034],[1,.016]],8);let a=(e,n,a,o,s,c)=>{let[l,u,d]=i(e),f=Math.hypot(o[0],o[1],o[2]),p=o[0]/f,m=o[1]/f,h=o[2]/f,g=-h,_=p,v=Math.hypot(g,_)||1;g/=v,_/=v,t.color(c);let y=r(l-g*a*.5,u+s,d-_*a*.5),b=r(l+g*a*.5,u+s,d+_*a*.5),x=l+p*n*.7,S=u+s+m*n*.7,C=d+h*n*.7,w=r(x-g*a*.56,S,C-_*a*.56),T=r(x+g*a*.56,S,C+_*a*.56),E=r(l+p*n,u+s+m*n,d+h*n);t.quad(y,b,T,w,0,0,a,n*.7,1,1,.92,.92),t.tri(w,T,E,0,n*.7,a,n*.7,a/2,n,.92,.92,.8)};for(let e=0;e<13;e++){let t=.1+e/12*.9,n=e%3==0?J.featherGold:e%3==1?J.feather:J.featherBlue;a(t,.5+.62*t**.8,.2-.07*t,[-1,-.1-.1*t,.1+1.25*t*t],-.01*e,n)}for(let e=0;e<9;e++){let t=.06+e/8*.86;a(t,.26+.12*t,.19,[-1,-.04,.2+.7*t*t],.02,e%2?J.feather:J.featherBlue)}return t.build()}var us=()=>new qe({uniforms:{uBend:{value:0},uBendCenter:{value:new W},uAlpha:{value:.55}},vertexShader:`
    uniform float uBend; uniform vec3 uBendCenter; varying vec2 vUv;
    void main() {
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vec2 d = wp.xz - uBendCenter.xz;
      wp.y += uBend * dot(d, d);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,fragmentShader:`
    precision highp float; uniform float uAlpha; varying vec2 vUv;
    void main() {
      vec2 c = vUv * 2.0 - 1.0;
      float a = smoothstep(1.0, 0.2, length(c)) * uAlpha;
      gl_FragColor = vec4(0.004, 0.006, 0.030, a);
    }`,transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2});function ds(e,t,n){let r=new Te,i=new Te;r.add(i);let a=e=>{let n=new St(e,t);return n.frustumCulled=!1,n},o=.85,s=new Te;s.position.y=o,r.remove(i),r.add(s),s.add(i);let c=new Te;c.position.set(Eo[0],0,0);let l=a(Io());l.position.x=-Eo[0];let u=a(Fo());u.position.set(So[0]-Eo[0],So[1],0);let d=new Te;d.position.set(Eo[0],Eo[1],0);let f=a(Lo()),p=a(Fo());p.position.set(Co[0]-Eo[0],Co[1]-Eo[1],0),d.add(f,p);let m=a(Ro());m.position.set(wo[0]-Eo[0],wo[1],0);let h=a(os());h.visible=!1,m.add(h),c.add(l,u,m);let g=new Te;g.add(c,d);let _=new Te;_.position.set(Ao[0],Ao[1],0);let v=a(Uo());v.position.set(-Ao[0],-Ao[1],0);let y=a(ns());y.position.set(zo.top[0]-Ao[0],zo.top[1]-Ao[1],0);let b=a(cs());b.position.copy(v.position);let x=a(Yo());x.position.set(qo[0]-Ao[0],qo[1]-Ao[1],0),x.rotation.z=Jo;let C=new Te,w=a(Ko());C.add(w),_.add(C);let T=new W(zo.d[0],zo.d[1],0),D=a(Wo(!1)),O=a(Wo(!0));D.position.copy(v.position),O.position.copy(v.position),O.visible=!1,_.add(D,O);let k=new At,A=new S(0,0,0,`YXZ`);_.add(v,y,b),i.add(g,_);let j=[];for(let e of[-1,1]){let t=a($o(.75+e*.08)),n=a(es(.75+e*.08)),r=new Te;r.position.x=Qo;let o=a(ts(e,!1)),s=a(ts(e,!0));s.visible=!1,r.add(o,s),n.add(r),i.add(t,n),j.push({side:e,upper:t,fore:n,hand:r,fist:o,open:s})}let ee=[];for(let e of[-1,1]){let t=a(rs(.4+e*.1)),n=a(is(.6+e*.1)),r=a(as()),o=a(as(!1));o.visible=!1,i.add(t,n,r,o),ee.push({side:e,thigh:t,shin:n,foot:r,boot:o})}let M=[];for(let e of[-1,1]){let t=new Te;t.position.set(-.2,1.2,e*.1);let r=a(ls(e<0)),i=new E(4);i.reset(0,0),i.addLocal(-.26,.06,1.48*e,.3,[.85,.92,1],1.4,3,.4),i.addLocal(-.06,.16,.62*e,.22,[1,.92,.7],1,3,.8);let o=new St(i.build(),n);o.frustumCulled=!1,o.renderOrder=61,t.add(r,o),t.scale.setScalar(1e-4),t.visible=!1,_.add(t),M.push({side:e,pivot:t})}let N=0,te=new E(4);te.reset(0,0),te.addLocal(Eo[0]+.17,Eo[1]-.12,0,.5,[1,.85,.55],1.5,3,.2),te.addLocal(So[0]-.4,So[1]+.18,0,.17,[1,.1,.04],.85,3,.7);let ne=new St(te.build(),n);ne.frustumCulled=!1,ne.renderOrder=61,g.add(ne);let re=us();re.uniforms.uBend=e.uBend,re.uniforms.uBendCenter=e.uBendCenter;let P=new St(new Ae(2,1).rotateX(-Math.PI/2),re);P.frustumCulled=!1,P.renderOrder=4,r.add(P);let ie=b.geometry.getAttribute(`position`),ae=[zo.top[0]-.05,zo.top[1]+.012],oe=0,F=new W,se=new W,I=new W,ce=new W,le=new W,ue=new W,de=new W,fe=new W,pe=new W(1,0,0),me=new W(0,1,0),he=new W(0,0,1),ge=new W,_e=new W,ve=new ut,ye=new W,be=new At,xe=new At,Se={q:new At().setFromRotationMatrix(new ut().makeBasis(new W(.7071,0,.7071),new W(0,1,0),new W(-.7071,0,.7071))),wrist:new W(-.105,.038,-.115)},L={t:0,stand:0,superK:0,noHand:0,whipK:0,cheer:0,hat:0,foot:0,grabL:0,grabR:0,bail:0,look:0,walk:0,hang:0,tuck:0,twist:0,climb:0},Ce=new W;function we(e,t,n,r,i,a=Zo){ce.subVectors(n,t);let o=ce.length(),s=Xo+a-.006;o=Math.min(Math.max(o,.07),s),ce.normalize();let c=(Xo*Xo-a*a+o*o)/(2*o),l=Math.sqrt(Math.max(Xo*Xo-c*c,0));le.copy(r).addScaledVector(ce,-r.dot(ce)),le.lengthSq()<1e-6&&le.set(0,-1,0),le.normalize(),I.copy(t).addScaledVector(ce,c).addScaledVector(le,l),e.upper.position.copy(t),e.upper.quaternion.setFromUnitVectors(pe,ue.subVectors(I,t).normalize()),ue.copy(t).addScaledVector(ce,o).sub(I).normalize(),e.fore.position.copy(I),ge.copy(i).addScaledVector(ue,-i.dot(ue)),ge.lengthSq()<.02&&ge.set(-1,0,0).addScaledVector(ue,ue.x),ge.normalize(),_e.crossVectors(ue,ge),e.fore.quaternion.setFromRotationMatrix(ve.makeBasis(ue,ge,_e))}let Ee={root:r,tilt:i,steer:d,shadow:P,pose(e){let t=e.dt||.016,n=e.speed||0,r=e.air>0;L.t+=t,L.stand=G(L.stand,e.sprint&&!r?1:0,7,t),L.superK=G(L.superK,+(e.trickPose===1),13,t),L.noHand=G(L.noHand,+(e.trickPose===2),13,t),L.whipK=G(L.whipK,+(e.trickPose===3||Math.abs(e.whip||0)>.15),13,t),L.cheer=G(L.cheer,+!!e.cheer,e.cheer?10:5,t),L.bail=G(L.bail,+!!e.bail,10,t),L.foot=G(L.foot,+(n<.4&&!r&&!e.walk),6,t),L.walk=e.park&&e.park.snap?+!!e.walk:G(L.walk,+!!e.walk,7,t);let a=L.walk,l=e.stride||0;L.hang=G(L.hang,e.walk&&r?1:0,9,t),L.tuck=G(L.tuck,e.walk&&r?nt(Math.abs(e.flipV||0)/4.5,0,1):0,11,t),L.twist=G(L.twist,e.walk&&r?nt(Math.abs(e.spinV||0)/4.5,0,1):0,11,t),L.climb=G(L.climb,e.walk&&e.scramble?1:0,12,t);let f=a*Math.min(1,n/1.2),v=Math.min(.34,.2+.03*n),b=nt((n-3.2)/2,0,1);L.hat=G(L.hat,+((n>17||(e.hyper||0)>.4)&&!r&&L.cheer<.3&&L.stand<.5),4,t),L.grabL=G(L.grabL,+(e.grab<0),e.grab<0?24:9,t),L.grabR=G(L.grabR,+(e.grab>0),e.grab>0?24:9,t),L.look=G(L.look,nt(e.look||0,-1.1,1.1),5,t);let x=e.squash||0,S=L.bail*Math.sin(L.t*23)*.35;u.rotation.z=-e.wheel,p.rotation.z=-e.wheel,m.rotation.z=-e.crank,d.rotation.y=(-e.steer*.42+S)*(1-a)+.34*a;let E=Math.sin(e.crank)*.115*L.stand;if(i.rotation.set(e.lean+E-L.foot*.07+S*.2,0,e.pitch,`YZX`),i.position.y=e.bob-o,s.rotation.set(0,-(e.spin||0),e.flip||0,`YZX`),a>.001&&e.park){i.updateWorldMatrix(!0,!1),i.worldToLocal(Ce.set(e.park.x,e.park.y,e.park.z));let t=a*a*(3-2*a);g.position.copy(Ce).multiplyScalar(t),i.getWorldQuaternion(be).invert().multiply(k.setFromEuler(A.set(.1,e.park.yaw,0))),g.quaternion.identity().slerp(be,t)}else g.position.set(0,0,0),g.quaternion.identity();h.visible=a>.5,O.visible=a>.5,D.visible=!O.visible,c.rotation.y=-(e.whip||0);let te=Ao[0]+.11*L.stand-.27*L.superK+.17*a,ne=Ao[1]+.15*L.stand+.3*L.superK-.11*x+.05*L.whipK+a*(-.012-.05*b*(1-L.hang)+.014*f*Math.cos(l*2)-.13*x);_.position.set(te,ne,0);let I=Math.sin(e.crank)*.04*Math.min(1,n/4)*(e.flying?.3:1)*(1-L.superK)*(1-a),ce=a*(.66-.04*n*(1-L.hang)-.85*L.tuck-.12*L.climb+.06*L.twist),le=(r?.08:0)-Math.abs(I)*.3-.24*L.stand-.82*L.superK+.2*L.cheer+.16*L.noHand-.14*x+.1*L.foot+.05*L.hat+ce;{let e=a*a*(3-2*a),t=zo.d;C.position.set(Go[0]-Ao[0]-t[0]*.13*e,Go[1]-Ao[1]-t[1]*.13*e,0),C.quaternion.setFromAxisAngle(T,-.42*e),w.position.set(-Go[0]-t[1]*.07*e,-Go[1]+t[0]*.07*e,0)}_.rotation.set(I-e.steer*.1*(1-a)-E*.7,e.steer*.1*(1-a)-L.look*.12*(1-.6*a)+.07*f*Math.sin(l),le,`YZX`);let ue=L.foot*Math.sin(L.t*.6)*.5,pe=-e.steer*(.32-.14*a)-L.look*.75+ue;y.rotation.set(-I*.8+E*.3,0,-e.pitch*.5-le*.75-ce*.02-.7*L.tuck*a+(e.flying?.12:0)+.12*L.cheer,`YZX`),be.setFromAxisAngle(he,-ce),xe.setFromAxisAngle(me,pe),be.multiply(xe).multiply(xe.setFromAxisAngle(he,ce)),y.quaternion.premultiply(be),y.position.set(zo.top[0]-Ao[0]-.035*a,zo.top[1]-Ao[1]+.012*a,0),_.updateMatrix(),fe.set(Bo[0]-Ao[0],Bo[1]-Ao[1]+.15,0).applyMatrix4(_.matrix);for(let e of j){let t=e.side;F.set(Vo[0]-Ao[0],Vo[1]-Ao[1],t*Vo[2]).applyMatrix4(_.matrix),se.set(No[0]-Eo[0],No[1]+.045-Eo[1],t*No[2]).applyAxisAngle(me,d.rotation.y),se.x+=Eo[0],se.y+=Eo[1],de.set(-.25,-.7,t*.75);let r=(e,t,n,r)=>{e>.001&&(se.x+=(t-se.x)*e,se.y+=(n-se.y)*e,se.z+=(r-se.z)*e)};if(r(L.noHand,F.x-.02,F.y+.2,F.z+t*.5),a>.001){let e=-Math.sin(l+(t>0?0:Math.PI))*f;t<0&&e<0&&(e*=.7);let i=.05+.22*b+e*(.34+.05*n),o=.492-.14*b,s=F.x+Math.sin(i)*o,c=F.y-Math.cos(i)*o,u=F.z+t*(t<0?.1:.04),d=(e,t,n,r)=>{s+=(t-s)*e,c+=(n-c)*e,u+=(r-u)*e};d(L.hang,F.x+.07,F.y-.11,F.z+t*.33),d(L.twist,F.x+.17,F.y-.2,t*.04),d(L.tuck,te+.31,ne-.19,t*.15),d(L.climb,F.x+.27,F.y+.27+.17*Math.sin(L.t*9+(t>0?0:Math.PI)),F.z+t*.02),r(a,s,c,u)}let i=t<0?L.hat:0;i>.001&&(F.y+=.06*i,F.z+=.015*i),r(i,fe.x+Se.wrist.x,fe.y+Se.wrist.y,fe.z+Se.wrist.z),t>0&&r(L.cheer,F.x+.1,F.y+.41+.055*Math.sin(L.t*11),F.z+.16);let o=t<0?L.grabL:L.grabR;r(o,F.x+.22,F.y+.02,F.z+t*.44),r(L.bail*.8,F.x+.1+.12*Math.sin(L.t*19+t),F.y+.25+.15*Math.sin(L.t*17+t*2),F.z+t*.4);let s=Math.min(1,L.noHand+(t>0?L.cheer:0)+L.bail);s+i>.3?de.set(-.15,-.35,t*.95):a>.5&&de.set(-1+L.twist+.8*L.climb,.15-.75*L.twist-.65*L.climb,t*(.25+.6*L.twist+.6*L.climb)),ye.set(-.9*s+.2*a,(1-s)*(1-a),t*(.45*s+a)).normalize(),we(e,F,se,de,ye,Zo-.07*i),e.hand.quaternion.identity(),i>.001&&e.hand.quaternion.slerp(xe.copy(e.fore.quaternion).invert().multiply(Se.q),i);let c=Math.max(L.noHand,i,o,L.bail,a*L.climb,a*L.hang*(1-L.tuck)*(1-L.twist))>.5;e.open.visible=c,e.fist.visible=!c}for(let t of ee){let n=e.crank+(t.side>0?0:Math.PI),r=wo[0]+Math.cos(-n)*Oo,i=wo[1]+Math.sin(-n)*Oo+.085,o=t.side*ko,s=1,c=te,u=ne-.03,d=(e,t,n,a)=>{e>.001&&(r+=(t-r)*e,i+=(n-i)*e,o+=(a-o)*e,s*=1-e)};if(d(L.superK,c-.86,u+.14,t.side*.1),d(L.whipK,c+.34,u-.36,t.side*.22),t.side<0&&d(L.foot,.06,.07,-.33),a>.001){let e=l+(t.side>0?0:Math.PI),n=t.side>0,r=c+Math.sin(e)*v*f,i=.052+Math.max(0,Math.cos(e))*(.1+.1*b)*f,o=t.side*.088,s=(e,t,n,a)=>{r+=(t-r)*e,i+=(n-i)*e,o+=(a-o)*e};s(L.hang,c+(n?.22:-.16),u-(n?.64:.77),t.side*.09),s(L.twist,c+.02,u-.885,t.side*.055),s(L.tuck,c+.25,u-.33,t.side*.1),s(L.climb,c+.31,u-.56+.17*Math.sin(L.t*9+(n?Math.PI:0)),t.side*.1),d(a,r,i,o)}d(L.bail*.6,c+.2+.2*Math.sin(L.t*15+t.side),u-.7,t.side*.3);let p=r-c,m=i-u,h=Math.hypot(p,m),g=.8979999999999999;h>g&&(p*=g/h,m*=g/h,h=g);let _=(jo*jo-Mo*Mo+h*h)/(2*h),y=Math.sqrt(Math.max(jo*jo-_*_,0)),x=c+p*_/h-m*y/h,S=u+m*_/h+p*y/h,C=c+p,w=u+m,T=(t.side*.129+o)/2+t.side*5e-4;t.thigh.position.set(c,u,t.side*.1),t.thigh.rotation.set(0,-Math.atan2(T-t.side*.1,jo),Math.atan2(S-u,x-c),`ZYX`),t.shin.position.set(x,S,T);let E=Math.atan2(w-S,C-x);t.shin.rotation.set(0,-Math.atan2(o-T,Mo),E,`ZYX`),t.foot.position.set(C-.02*s,w-.035*s,o),t.foot.rotation.z=(-.22+.25*Math.sin(-n))*s+(E+1.25)*L.superK,t.boot.visible=a>.5,t.foot.visible=!t.boot.visible,t.boot.position.copy(t.foot.position),t.boot.rotation.z=t.foot.rotation.z}oe+=t*(2.5+n*.9);let ge=Math.min(1,n/9),_e=ie.array;for(let t=0;t<2;t++){let n=t===0?-1:1;for(let r=0;r<=ss;r++){let i=r/ss,a=r*(.085-t*.012),o=i**1.3*(.05+.1*ge),s=oe*(1+t*.17)-r*.85+t*1.9,c=-a*(.25+.75*ge),l=-a*(1-ge)*.95+a*ge*.1,u=ae[0]+c,d=ae[1]+l+Math.sin(s)*o,f=n*(.035+i*.05)+Math.cos(s*.83+1)*o*.9-e.steer*i*.16*ge,p=.036*(1-.35*i),m=(t*11+r)*6,h=Math.sin(s*.6)*.8;_e[m]=u,_e[m+1]=d-Math.cos(h)*p,_e[m+2]=f-Math.sin(h)*p,_e[m+3]=u,_e[m+4]=d+Math.cos(h)*p,_e[m+5]=f+Math.sin(h)*p}}ie.needsUpdate=!0;let ve=+!!e.wings;N+=(ve-N)*Math.min(1,t*5);for(let t of M){t.pivot.visible=N>.002;let n=N<.5?2*N*N:1-(-2*N+2)**2/2;t.pivot.scale.setScalar(Math.max(1e-4,n*(1+.25*Math.sin(Math.min(N,1)*Math.PI))));let r,i;if(e.flying){let t=Math.sin(e.flap||0);r=e.climb?.1+t*.78:.16+t*.1,i=e.climb?-.1+Math.cos(e.flap||0)*.1:-.05}else r=1.12+Math.sin(oe*.5)*.04,i=-.55;t.pivot.rotation.set(-t.side*r,t.side*i,0,`YXZ`)}re.uniforms.uAlpha.value=.55*Math.max(0,1-e.air*.25);let Te=1+e.air*.12;P.scale.set(Te*(1-.58*a),1,Te*(1-.25*a))},setLamp(e){t.uniforms.uDynLamp.value.copy(e)},setColors(e){if(!De){let e=Object.keys(J);De=[],r.traverse(n=>{if(!n.isMesh||n.material!==t)return;let r=n.geometry.getAttribute(`color`);if(!r)return;let i=new Int8Array(r.count).fill(-1),a=new Float32Array(r.count);for(let t=0;t<r.count;t++){let n=r.getX(t),o=r.getY(t),s=r.getZ(t);for(let r=0;r<e.length;r++){let c=J[e[r]],l=n/c[0];if(l>0&&Math.abs(o/c[1]-l)<.01*l&&Math.abs(s/c[2]-l)<.01*l){i[t]=r,a[t]=l;break}}}De.push({a:r,key:i,k:a})}),De.keys=e}let n=De.keys.map(t=>e[t]||J[t]);for(let{a:e,key:t,k:r}of De){for(let i=0;i<e.count;i++)if(t[i]>=0){let a=n[t[i]];e.setXYZ(i,a[0]*r[i],a[1]*r[i],a[2]*r[i])}e.needsUpdate=!0}}},De=null;return Ee}var fs=8.2,ps=15.5,ms=19,hs=9.4,gs=Math.PI*2,_s=9.4,vs=8.6,ys=13,bs=8.5,xs=[``,`超人`,`脱手`,`甩尾`],Ss=[``,``,`双周`,`三周`,`四周`],Cs=.34,ws=.6,Ts=.28,Es=2.2,Ds=6.4,Os=5.6,ks={floor:0,blocked:!1,roof:!1,hall:null,ceil:1/0},As={steer:0,throttle:0,brake:0,trick:0,trickPressed:!1},js=class{constructor(){this.reset()}reset(){let e=we.bike;this.gx=e.gx,this.gz=e.gz,this.heading=e.heading,this.y=this.groundAt(this.gx,this.gz),this.vy=0,this.speed=0,this.steer=0,this.lean=0,this.pitch=0,this.grounded=!0,this.coyote=0,this.airTime=0,this.wheel=0,this.crank=0,this.bob=0,this.squash=0,this.onRoof=!1,this.hall=null,this.bump=0,this.landed=0,this.jumped=!1,this.distance=0,this.auto=!1,this.wings=!1,this.flying=!1,this.climbing=!1,this.flap=0,this.roadT=0,this.wingsFolded=!1,this.spin=0,this.flip=0,this.spinV=0,this.flipV=0,this.whip=0,this.pose=0,this.poseHeld=[0,0,0,0],this.poseCount=0,this.airTop=0,this.airRoof=!1,this.trick=null,this.bail=0,this.gv=0,this.launched=!1,this.lifting=!1,this.hyper=0,this.hyperK=0,this.walking=!1,this.stride=0,this.back=!1,this.scramble=!1,this.climbT=0,this.wallT=0,this.kicks=0,this.flipArm=!1,this.park=null,this.wx=0,this.wz=0,this.fx=0,this.fz=-1,this.syncWorld()}takeOff(e){this.vy=Math.max(this.vy,e),this.grounded=!1,this.lifting=!0}setWalking(e){return e===this.walking||this.auto||!this.grounded||e&&(this.wings||this.bail>0)?!1:(this.syncWorld(),e?(this.park={x:this.wx-this.fz*.55,y:this.y,z:this.wz+this.fx*.55,yaw:-this.worldHeading,snap:!1},this.speed=Math.min(this.speed,2),this.hyper=0,this.back=!1,this.stride=0):(this.park.snap=Math.hypot(this.park.x-this.wx,this.park.z-this.wz)>7||Math.abs(this.park.y-this.y)>1.5,this.speed=0),this.walking=e,this.steer=0,this.lean=0,this.spin=0,this.flip=0,this.whip=0,this.gv=0,this.pose=0,this.scramble=!1,this.climbT=0,this.wallT=0,this.kicks=0,!0)}walk(e,t){this.landed=0,this.bump=0,this.jumped=!1,this.launched=!1,this.sprinting=!1,this.steer=G(this.steer,t.steer,10,e),this.heading+=this.steer*2.9*e*(this.grounded?1:.3),this.hyper>0&&(this.hyper=0),this.bail>0&&(this.bail=Math.max(0,this.bail-e)),this.hyperK=G(this.hyperK,0,2.2,e);let n=t.brake>0&&!(t.throttle>0),r=t.throttle>0?t.trick>0?Os:3:n?1.5:0;this.grounded&&n!==this.back&&(this.speed>.15?r=0:this.back=n),this.grounded||(r=this.speed);let i=this.speed,a=r>i?9:13;this.speed=nt(i+nt(r-i,-a*e,a*e),0,Os);let o=this.back?-1:1;this.grounded?this.coyote=.12:this.coyote-=e,t.jumpPressed&&this.coyote>0?(this.vy=8.4,this.grounded=!1,this.lifting=!0,this.coyote=0,this.jumped=!0,this.airRoof=this.onRoof,this.flipArm=!1):t.jumpPressed&&!this.grounded&&this.wallT>0&&this.kicks<4&&(this.heading+=Math.PI,this.steer=0,this.vy=8,this.speed=Os,this.back=!1,this.wallT=0,this.kicks++,this.scramble=!1,this.jumped=!0,this.flipArm=!1),this.scramble&&(this.speed=Math.max(this.speed,3));let s=this.speed*e,c=Math.max(1,Math.ceil(s/.3)),l=Math.cos(this.heading)*s*o/c,u=Math.sin(this.heading)*s*o/c,d=this.grounded?this.onRoof?1.35:ws:Ts;this.shut(this.gx,this.gz,d)&&this.unstick(d);let f=!1;for(let t=0;t<c;t++)if(!this.shut(this.gx+l,this.gz+u,d))this.gx+=l,this.gz+=u;else if(f=!0,!this.shut(this.gx+l,this.gz,d))this.gx+=l,this.speed*=1-Math.min(.9,4*e);else if(!this.shut(this.gx,this.gz+u,d))this.gz+=u,this.speed*=1-Math.min(.9,4*e);else{this.speed*=.5;break}this.distance+=s,this.grounded?(this.wallT=0,this.climbT=0,this.kicks=0):this.wallT=f&&o>0?.18:Math.max(0,this.wallT-e);let p=this.probe(this.gx,this.gz,this.y,d),m=p.floor,h=p.ceil;if(this.hall=p.hall&&this.y<p.hall.under?p.hall:null,this.onRoof=p.roof&&this.grounded,this.grounded&&(m<this.y-.7?(this.grounded=!1,this.vy=0,this.airRoof=p.roof):(this.y+=(m-this.y)*Math.min(1,22*e),this.vy=0)),this.grounded)this.airTime=0,this.scramble=!1,this.spin=G(this.spin,0,16,e),this.flip=G(this.flip,0,16,e),this.whip=0,this.spinV=0,this.flipV=0,this.pose=0;else{this.lifting&&=(this.y=Math.max(this.y,m),!1);let n=t.jump>0;if(this.scramble=this.wallT>0&&t.throttle>0&&this.climbT<Es&&this.vy>-9,this.scramble)this.climbT+=e,this.vy=Math.min(Ds,Math.max(this.vy,0)+45*e);else{let t=this.vy>0?n?ms*.55:ms:n?ms*.42:ms*.9;this.vy=Math.max(this.vy-t*e,n?-9:-30)}this.y+=this.vy*e,this.y+1.75>h-.05&&(this.y=h-.05-ye,this.vy>0&&(this.vy=-.5)),this.airTime+=e,this.airTime<=e*1.5&&(this.airTop=this.y),this.airTop=Math.max(this.airTop,this.y),t.throttle>0||(this.flipArm=!0);let r=!this.scramble&&this.wallT<=0;As.steer=r?t.steer:0,As.throttle=r&&this.flipArm?t.throttle:0,As.brake=r?t.brake:0,this.tricks(e,As,m),this.y<=m&&(this.landed=-this.vy,this.squash=Math.min(1,this.landed/14),this.y=m,this.vy=0,this.grounded=!0,this.land(m),this.airTime=0,this.scramble=!1)}this.flying=!1,this.climbing=!1,this.wingsFolded=!1,this.gv=0,this.pitch=G(this.pitch,0,10,e),this.lean=G(this.lean,0,8,e),this.squash=G(this.squash,0,7,e),this.bob=-this.squash*.1,this.grounded&&(this.stride+=o*this.speed*e*(Math.PI/2)/Math.min(.34,.2+.03*this.speed)),this.syncWorld()}groundAt(e,t){return O(e,t,-1e4,0,ks).floor}probe(e,t,n,r){let i=b(e,t,n,r,Cs);return O(e,t,n,r,ks),ks.blocked=ks.blocked||i,ks}shut(e,t,n){return b(e,t,this.y,n,Cs)}unstick(e){for(let t=.06;t<1.5;t*=1.4)for(let n=0;n<12;n++){let r=this.heading+Math.PI+(n%2?1:-1)*Math.ceil(n/2)*(Math.PI/6),i=this.gx+Math.cos(r)*t,a=this.gz+Math.sin(r)*t;if(!this.shut(i,a,e)){this.gx=i,this.gz=a;return}}}sidestep(e,t,n,r,i,a){let o=Math.abs(e)>Math.abs(t),s=+!o,c=+!!o,l=(o?t:e)>=0?1:-1;for(let o=1;o<=4;o++)for(let u=0;u<2;u++){let d=u?-l:l,f=d*o*.22,p=this.gx+s*f,m=this.gz+c*f;if(this.shut(p,m,i)||this.shut(p+n,m+r,i)||this.shut(p+e*.9,m+t*.9,i))continue;let h=d*Math.min(Math.abs(f),Math.max(a,.04)*1.3);if(!this.shut(this.gx+s*h,this.gz+c*h,i))return this.gx+=s*h,this.gz+=c*h,!0}return!1}update(e,t){if(this.walking&&this.auto&&(this.walking=!1,this.park&&(this.park.snap=!0)),this.walking)return this.walk(e,t);this.landed=0,this.bump=0,this.jumped=!1,this.launched=!1;let n=t.steer;this.auto&&(n=0),this.steer=G(this.steer,n,n===0?7:5.5,e);let r=this.speed,i=(2.5-1.05*We(4,16,r))*Math.max(nt(r/2.2,0,1),Math.abs(n)>.1?.28:0);if(this.heading+=this.steer*i*e*(this.grounded?1:this.wings?.9:.3),this.grounded&&Math.abs(n)<.05&&r>1&&!this.onRoof){let t=Math.round(this.heading/(Math.PI/2))*(Math.PI/2),n=Le(this.heading,t);Math.abs(n)<.5&&(this.heading+=n*Math.min(1,1.6*e)),this.centreInLane(e,t)}this.hyper>0&&(this.hyper=Math.max(0,this.hyper-e)),this.hyperK=G(this.hyperK,+(this.hyper>0),this.hyper>0?5:2.2,e),this.bail>0&&(this.bail=Math.max(0,this.bail-e));let a=1+.8*this.hyperK,o=this.wings&&!this.grounded&&!this.auto,s=!this.grounded&&!this.wings,c=(o?15:fs)*a;t.throttle>0&&!s&&(c=(o?25:ps)*a),t.brake>0&&!s&&(c=o?7:0),s&&!this.auto&&(c=Math.max(r,fs*.8)),this.auto&&(c=this.autoSpeed??0),this.sprinting=this.grounded&&t.throttle>0&&!this.auto&&r>4;let l=this.pitch,u=(c>r?this.grounded?5.2:o?6:1.5:t.brake>0?11:3.2)*(1+1.2*this.hyperK);this.speed+=nt(c-r,-u*e,u*e),this.grounded&&(this.speed-=Math.sin(l)*(this.onRoof?2:6.5)*e),this.speed=nt(this.speed,0,32),this.grounded?this.coyote=.12:this.coyote-=e,t.jumpPressed&&this.coyote>0&&!this.auto&&(this.vy=(this.wings?7.5:hs)*(1+.12*this.hyperK),this.airRoof=this.onRoof,this.grounded=!1,this.lifting=!0,this.coyote=0,this.jumped=!0);let d=this.speed*e,f=Math.max(1,Math.ceil(d/.3)),p=Math.cos(this.heading),m=Math.sin(this.heading),h=p*d/f,g=m*d/f,_=this.grounded?this.onRoof?1.35:ws:Ts;this.shut(this.gx,this.gz,_)&&this.unstick(_);for(let t=0;t<f;t++){if(!this.shut(this.gx+h,this.gz+g,_)){this.gx+=h,this.gz+=g;continue}let t=!this.shut(this.gx+h,this.gz,_),r=!this.shut(this.gx,this.gz+g,_),i=Math.abs(p)>Math.abs(m);if(!(i?t:r)&&!this.auto&&this.sidestep(p,m,h,g,_,d/f))continue;let a;if(t&&(!r||i))this.gx+=h,a=p>=0?0:Math.PI,this.bump=Math.max(this.bump,Math.abs(m)*this.speed);else if(r)this.gz+=g,a=m>=0?Math.PI/2:-Math.PI/2,this.bump=Math.max(this.bump,Math.abs(p)*this.speed);else{this.bump=Math.max(this.bump,this.speed),this.speed*=.5;let t=Math.abs(n)>.1?Math.sign(n):0;for(let e=1;e<=5&&!t;e++){let n=Math.cos(e*.5236),r=Math.sin(e*.5236),i=!this.shut(this.gx+(p*n-m*r)*.75,this.gz+(m*n+p*r)*.75,_);i===!this.shut(this.gx+(p*n+m*r)*.75,this.gz+(m*n-p*r)*.75,_)?i&&(t=this.turnSide||1):t=i?1:-1}this.turnSide=t||this.turnSide||1,this.heading+=this.turnSide*5.5*e;break}let o=Le(this.heading,a);this.heading+=o*Math.min(1,9*e),this.speed*=1-Math.min(.9,Math.abs(Math.sin(o))*6*e)}this.distance+=d;let v=this.probe(this.gx,this.gz,this.y,_),y=v.floor,b=v.ceil,x=v.roof;if(this.hall=v.hall&&this.y<v.hall.under?v.hall:null,this.onRoof=v.roof&&this.grounded,this.grounded){let t=this.y+this.gv*e-.5*ms*e*e;if(y<this.y-.7)this.grounded=!1,this.vy=this.gv>2?this.gv:Math.min(this.vy,0),this.airRoof=x;else if(this.gv>2.4&&t-y>.06&&!this.auto)this.grounded=!1,this.vy=this.gv*1.12+.6,this.y=t,this.airRoof=x,this.launched=!0;else{let t=this.y;this.y+=(y-this.y)*Math.min(1,22*e),this.gv=G(this.gv,(this.y-t)/Math.max(e,1e-4),16,e),this.vy=0}}if(this.grounded)this.airTime=0,this.spin=G(this.spin,0,16,e),this.flip=G(this.flip,0,16,e),this.whip=G(this.whip,0,16,e),this.spinV=0,this.flipV=0,this.pose=0;else{this.lifting&&=(this.y=Math.max(this.y,y),!1);let n=t.jump>0&&!this.auto;if(this.wings){let t=this.groundAt(this.gx,this.gz)+85,r=n?26*nt((t-this.y)/14,0,1):0;this.vy+=(r-9)*e,this.vy=nt(this.vy,-5.5,10),this.flap+=e*(n?10.5:2.4),this.climbing=n}else{let t=this.vy>0?n?ms*.55:ms:n?ms*.42:ms*.9;this.vy-=t*e,this.vy=Math.max(this.vy,n?-9:-30)}this.y+=this.vy*e,this.y+1.75>b-.05&&(this.y=b-.05-ye,this.vy>0&&(this.vy=-.5)),this.airTime+=e,this.airTime<=e*1.5&&(this.airTop=this.y),this.airTop=Math.max(this.airTop,this.y),this.tricks(e,t,y),this.y<=y&&(this.landed=-this.vy,this.squash=Math.min(1,this.landed/14),this.y=y,this.vy=0,this.grounded=!0,this.gv=0,this.land(y),this.airTime=0)}this.wingsFolded=!1,this.wings&&!this.auto&&(this.grounded&&!x?(this.roadT+=e,this.roadT>.16&&(this.wings=!1,this.wingsFolded=!0,this.roadT=0)):this.roadT=0),this.flying=this.wings&&!this.grounded,this.flying||(this.climbing=!1);let S=this.probe(this.gx+p*.6,this.gz+m*.6,this.y+.3,.9).floor,C=this.probe(this.gx-p*.6,this.gz-m*.6,this.y+.3,.9).floor,w=this.grounded?Math.atan2(nt(S-C,-1.2,1.2),1.2):nt(this.vy*.035,-.5,.45);this.pitch=G(this.pitch,w,this.grounded?10:4,e),this.lean=G(this.lean,this.steer*nt(this.speed/9,0,1.3)*(this.flying?.62:.42),8,e),this.squash=G(this.squash,0,7,e),this.wheel+=this.speed*e/xo;let T=(this.grounded||this.flying)&&c>=r-.5&&c>.5;T&&(this.crank+=nt(this.speed*.62,2,9)*e),this.bob=-this.squash*.1+(T?Math.sin(this.crank*2)*.008:0),this.syncWorld()}tricks(e,t,n){let r=!this.auto&&!this.wings&&this.airTime>.1&&(this.y-n>.8||this.airTime>.3),i=(e,t,n)=>{let r=e-Math.round(e/gs)*gs;return nt(-r*16,-n,n)||0},a=this.vy<-1&&this.y-n<-this.vy*.26,o=a?2.2:1,s=r&&!a&&Math.abs(t.steer)>.4?Math.sign(t.steer)*_s:i(this.spin,this.spinV,_s*o),c=r&&!a?+(t.brake>0)-(t.throttle>0):0,l=c===0?i(this.flip,this.flipV,vs*o):c*vs;this.spinV=G(this.spinV,s,a?40:16,e),this.flipV=G(this.flipV,l,a?40:16,e),this.spin+=this.spinV*e,this.flip+=this.flipV*e,r&&t.trickPressed&&(this.poseCount++,this.pose=(this.poseCount-1)%3+1),(!r||!t.trick)&&(this.pose!==3||Math.abs(this.whip-Math.round(this.whip/gs)*gs)<.2)&&(this.pose=this.pose===3&&t.trick?3:0),this.pose>0&&(this.poseHeld[this.pose]+=e),this.pose===3?this.whip+=ys*e:Math.abs(this.whip-Math.round(this.whip/gs)*gs)>.05&&(this.whip+=Math.min(ys*e,Math.ceil(this.whip/gs)*gs-this.whip))}peek(){let e=[],t=Math.trunc(this.flip/gs+Math.sign(this.flip)*.12),n=Math.trunc(this.spin/gs+Math.sign(this.spin)*.12);t!==0&&e.push(Ss[Math.min(Math.abs(t),4)]+(t>0?`后空翻`:`前空翻`)),n!==0&&e.push(String(360*Math.abs(n)));for(let t=1;t<=3;t++)(t===3?this.whip>gs*.9:this.poseHeld[t]>.22)&&e.push(xs[t]);return e}land(e){let t=[],n=0,r=!0,i=this.spin/gs,a=this.flip/gs,o=Math.round(i),s=Math.round(a),c=Math.abs(i-o)*gs;if((Math.abs(a-s)*gs>1||c>1.5)&&(r=!1),s!==0){let e=Math.min(Math.abs(s),4);t.push(Ss[e]+(s>0?`后空翻`:`前空翻`)),n+=120*e*(1+.25*(e-1))}if(o!==0){let e=Math.abs(o);t.push(String(360*e)),n+=80*e*(1+.2*(e-1))}for(let e=1;e<=3;e++)if(e===3?this.whip>gs*.9:this.poseHeld[e]>.22){let r=e===3?Math.round(this.whip/gs):1;t.push((r>1?Ss[Math.min(r,4)]:``)+xs[e]),n+=e===3?100*r:60+50*Math.min(this.poseHeld[e],2)}let l=this.airTop-e;t.length===0&&l>6.5&&this.airTime>1.1&&(t.push(`腾空飞跃`),n+=40),t.length&&(n+=Math.max(0,l-3)*6,this.airRoof&&(n*=1.25),n*=1+.3*(t.length-1)),r||(this.bail=1,this.speed*=.45),this.trick=t.length||!r?{names:t,points:r?Math.round(n/10)*10:0,clean:r,combo:t.length,drop:l,roof:this.airRoof}:null,this.spin=(i-o)*gs,this.flip=(a-s)*gs,this.whip-=Math.round(this.whip/gs)*gs,this.spinV=0,this.flipV=0,this.pose=0,this.poseCount=0,this.poseHeld=[0,0,0,0],this.airRoof=!1}centreInLane(t,n){let r=I(this.gx),i=xt(this.gz),a=Xe(r),o=Xe(r+1),s=Ne(i),c=Ne(i+1),l=this.gx>a+e(r)&&this.gx<o-e(r+1),u=this.gz>s+U(i)&&this.gz<c-U(i+1),d=Math.abs(Math.sin(n))>.5,f=Math.min(1,.55*t*(1+2.2*this.hyperK));if(d&&!l&&u){let t=this.gx<=a+e(r)?a:o;this.gx+=(t-this.gx)*f*.6}else if(!d&&l&&!u){let e=this.gz<=s+U(i)?s:c;this.gz+=(e-this.gz)*f*.6}}syncWorld(){let e=this.gx,t=this.gz;this.wx=ft(e,t),this.wz=wt(e,t);let n=.5,r=Math.cos(this.heading),i=Math.sin(this.heading),a=ft(e+r*n,t+i*n)-this.wx,o=wt(e+r*n,t+i*n)-this.wz,s=Math.hypot(a,o)||1;this.fx=a/s,this.fz=o/s,this.worldHeading=Math.atan2(this.fz,this.fx)}},Ms={floor:0,blocked:!1,roof:!1},Ns=class{constructor(){this.yaw=-Math.PI/2,this.frac=1,this.lift=0,this.y=0,this.pos={x:0,y:0,z:0},this.target={x:0,y:0,z:0},this.fov=70,this.shake=0,this.roll=0,this.clock=0}snap(e){this.yaw=e.heading,this.frac=1,this.lift=0,this.dist=void 0,this.y=e.y+1.6,this.update(.016,e,{lookYaw:0,lookPitch:0})}update(e,t,n){this.yaw+=Le(this.yaw,t.heading)*Math.min(1,3.4*e);let r=this.yaw+n.lookYaw,i=We(6,16,t.speed),a=t.grounded?0:Math.max(0,t.y-t.groundAt(t.gx,t.gz)),o=t.flying?Math.min(1,.35+a/25):t.grounded?0:.55*We(2.5,9,a);this.air=G(this.air||0,o,2.5,e);let s=t.hyperK||0,c=n.zoom||1,l=(4.9+1.3*i+5.5*this.air-1.7*s)*c*(t.walking?.74:1);this.dist=this.dist===void 0?l:G(this.dist,l,6,e);let u=this.dist,d=((t.onRoof?3:2.45)+2.6*this.air-.32*s)*(.45+.55*c)+Math.sin(n.lookPitch)*u,f=Math.cos(r),p=Math.sin(r),m=t.gx,h=t.gz,g=t.y+1.35,_=-f*u,v=-p*u,y=d-1.35,b=e=>{for(let t=2;t<=9;t++){let n=t/9,r=g+(y+e)*n;if(O(m+_*n,h+v*n,r-.45,0,Ms),Ms.blocked||Ms.floor>r-.4)return(t-1)/9}return 1},x=0,S=b(0);if(S<.8)for(let e of[2.6,5.2,8.5]){let t=b(e);if(t>S+.15&&(S=t,x=e),t>=.8)break}S=Math.max(S,.25),this.lift=G(this.lift||0,x,x>(this.lift||0)?6:1.4,e),this.frac=S<this.frac?G(this.frac,S,14,e):G(this.frac,S,2.2,e);let C=this.frac,w=m+_*C,T=h+v*C,E=g+(y+this.lift)*C+(1-C)*1.6;O(w,T,E,.2,Ms),E=Math.max(E,Ms.floor+.7),this.y=G(this.y,E,7,e),this.shake=G(this.shake,0,6,e),this.pos.x=ft(w,T),this.pos.z=wt(w,T),this.clock+=e,this.pos.y=this.y+this.shake*.12*Math.sin(this.clock*45);let D=3.6,k=t.gx+Math.cos(r)*D,A=t.gz+Math.sin(r)*D;this.target.x=ft(k,A),this.target.z=wt(k,A),this.target.y=t.y+1.7-Math.sin(n.lookPitch)*2-this.lift*.22-this.air*1.9,this.fov=72+12*i+5*this.air+15*s,this.roll=G(this.roll,-t.lean*(.18+.4*s)*(t.grounded?1:.3),5,e)}};function Ps(e){let t=new Set,n={steer:0,throttle:0,brake:0,jump:0,jumpPressed:!1,trick:0,trickPressed:!1,lookYaw:0,lookPitch:0,looking:!1,lastLook:-10,zoom:1,zoomTo:1,any:!1},r=!1,i=!1,a=[`KeyA`,`ArrowLeft`],o=[`KeyD`,`ArrowRight`],s=[`KeyW`,`ArrowUp`],c=[`KeyS`,`ArrowDown`],l=[`KeyE`,`ShiftLeft`,`ShiftRight`],u=new Set([...a,...o,...s,...c,`Space`]),d=e=>!!(e.target&&e.target.closest&&e.target.closest(`#board`));window.addEventListener(`keydown`,e=>{e.metaKey||e.ctrlKey||e.altKey||d(e)||(u.has(e.code)&&e.preventDefault(),e.code===`Space`&&!e.repeat&&(r=!0),l.includes(e.code)&&!e.repeat&&(i=!0),t.add(e.code),n.any=!0)}),window.addEventListener(`keyup`,e=>t.delete(e.code)),window.addEventListener(`blur`,()=>t.clear());let f=null;e.addEventListener(`pointerdown`,t=>{t.pointerType!==`touch`&&(f={x:t.clientX,y:t.clientY,yaw:n.lookYaw,pitch:n.lookPitch},n.looking=!0,e.setPointerCapture(t.pointerId))}),e.addEventListener(`pointermove`,e=>{f&&e.pointerType!==`touch`&&(n.lookYaw=f.yaw+(e.clientX-f.x)*.0052,n.lookPitch=Math.max(-.5,Math.min(.9,f.pitch+(e.clientY-f.y)*.004)))});let p=e=>{e.pointerType!==`touch`&&(f=null,n.looking=!1,n.lastLook=performance.now()/1e3)};e.addEventListener(`pointerup`,p),e.addEventListener(`pointercancel`,p),e.addEventListener(`wheel`,e=>{e.preventDefault();let t=Math.max(-120,Math.min(120,e.deltaY*(e.deltaMode===1?32:1)*(e.ctrlKey?4:1)));n.zoomTo=Math.max(.5,Math.min(2.8,n.zoomTo*Math.exp(t*.0016)))},{passive:!1});let m=document.getElementById(`stick`),h=document.getElementById(`stick-knob`),g=null,_=null,v=null,y=0,b=!1,x=!1,S=!1,C=(e,t=0,n=0,r=0,i=0)=>{m&&(m.classList.toggle(`on`,e),e&&(m.style.left=`${t}px`,m.style.top=`${n}px`,h.style.transform=`translate(${r}px, ${i}px)`))},w=(e,t)=>Math.hypot(e.clientX-t.x,e.clientY-t.y);e.addEventListener(`touchstart`,e=>{e.preventDefault(),n.any=!0;for(let t of e.changedTouches)!g&&t.clientX<window.innerWidth*.5?(g={id:t.identifier,x0:t.clientX,y0:t.clientY},document.getElementById(`stick-demo`)?.classList.remove(`on`),C(!0,t.clientX,t.clientY)):_?v||={id:t.identifier,d0:Math.max(30,w(t,_)),zoom0:n.zoomTo}:(_={id:t.identifier,x:t.clientX,y:t.clientY,x0:t.clientX,y0:t.clientY,yaw:n.lookYaw,pitch:n.lookPitch},n.looking=!0)},{passive:!1}),e.addEventListener(`touchmove`,e=>{e.preventDefault();for(let t of e.changedTouches){if(g&&t.identifier===g.id){let e=t.clientX-g.x0,n=t.clientY-g.y0,r=Math.hypot(e,n);r>70&&(e*=70/r,n*=70/r);let i=e/70,a=n/70,o=Math.abs(i),s=o<.22?0:(o-.22)/.78;y=Math.sign(i)*s**2.2,b=a<-.4,x=a>.4,C(!0,g.x0,g.y0,e,n)}else _&&t.identifier===_.id&&(_.x=t.clientX,_.y=t.clientY,v||(n.lookYaw=_.yaw+(t.clientX-_.x0)*.0052,n.lookPitch=Math.max(-.5,Math.min(.9,_.pitch+(t.clientY-_.y0)*.004))));if(v&&_&&(t.identifier===v.id||t.identifier===_.id)){let r=t.identifier===v.id?t:[...e.touches].find(e=>e.identifier===v.id);r&&(n.zoomTo=Math.max(.5,Math.min(2.8,v.zoom0*v.d0/Math.max(30,w(r,_)))))}}},{passive:!1});let T=e=>{e.preventDefault();for(let t of e.changedTouches)g&&t.identifier===g.id&&(g=null,y=0,b=x=!1,C(!1)),v&&t.identifier===v.id&&(v=null),_&&t.identifier===_.id&&(_=null,v=null,n.looking=!1,n.lastLook=performance.now()/1e3)};e.addEventListener(`touchend`,T,{passive:!1}),e.addEventListener(`touchcancel`,T,{passive:!1}),((e,t,r)=>{let i=document.getElementById(e);if(!i)return;let a=e=>{i.classList.contains(`down`)&&(i.classList.remove(`down`),r()),e&&e.preventDefault()};i.addEventListener(`pointerdown`,e=>{e.preventDefault();try{i.setPointerCapture(e.pointerId)}catch{}i.classList.add(`down`),n.any=!0,t()}),i.addEventListener(`pointerup`,a),i.addEventListener(`pointercancel`,a),i.addEventListener(`lostpointercapture`,()=>a()),i.addEventListener(`contextmenu`,e=>e.preventDefault())})(`pad-jump`,()=>{S=!0,r=!0},()=>{S=!1});let E=e=>e.some(e=>t.has(e)),D={steer:0,throttle:!1,brake:!1,jump:!1,trick:!1,prev:[],lastT:0,looking:!1};n.onLeap=null,n.pad=!1;let O=e=>{window.dispatchEvent(new KeyboardEvent(`keydown`,{code:e,bubbles:!0})),window.dispatchEvent(new KeyboardEvent(`keyup`,{code:e,bubbles:!0}))},k=(e,t=.2)=>Math.abs(e)<t?0:(e-Math.sign(e)*t)/(1-t);function A(e){let t=Math.min(.1,Math.max(0,e-D.lastT));D.lastT=e,D.steer=0,D.throttle=D.brake=D.jump=D.trick=!1;let a=navigator.getGamepads?navigator.getGamepads():[],o=0,s=0,c=0,l=0,u=!1;for(let e of a){if(!e||!e.connected)continue;let a=t=>!!(e.buttons[t]&&(e.buttons[t].pressed||e.buttons[t].value>.35)),d=D.prev[e.index]||(D.prev[e.index]=[]),f=e=>a(e)&&!d[e];o+=k(e.axes[0]||0),s+=k(e.axes[1]||0),c+=k(e.axes[2]||0),l+=k(e.axes[3]||0),a(14)&&--o,a(15)&&(o+=1),a(7)&&(D.throttle=!0),a(6)&&(D.brake=!0),a(0)&&(D.jump=!0),(a(2)||a(5))&&(D.trick=!0),f(0)&&(r=!0,n.onLeap&&n.onLeap()),(f(2)||f(5))&&(i=!0);let p=!!document.querySelector(`#board:not(.hidden)`);f(1)&&O(p?`Escape`:`KeyF`),f(3)&&O(`KeyT`),f(4)&&O(`Tab`),f(9)&&O(`Enter`),f(8)&&O(`Escape`),a(12)&&(n.zoomTo=Math.max(.5,n.zoomTo*Math.exp(-1.2*t))),a(13)&&(n.zoomTo=Math.min(2.8,n.zoomTo*Math.exp(1.2*t)));for(let t=0;t<e.buttons.length;t++)d[t]=a(t),d[t]&&(u=!0);(o||s||c||l)&&(u=!0)}u&&(n.any=!0,n.pad=!0),D.steer=Math.max(-1,Math.min(1,o)),s<-.45&&(D.throttle=!0),s>.45&&(D.brake=!0),c||l?(n.lookYaw+=c*2.6*t,n.lookPitch=Math.max(-.5,Math.min(.9,n.lookPitch+l*1.8*t)),n.looking=D.looking=!0):D.looking&&(D.looking=!1,n.looking=!1,n.lastLook=e)}return n.update=e=>{A(e),n.steer=+!!E(o)-!!E(a)+y+D.steer,n.steer=Math.max(-1,Math.min(1,n.steer)),n.throttle=E(s)||b||D.throttle?1:0,n.brake=E(c)||x||D.brake?1:0,n.jump=t.has(`Space`)||S||D.jump?1:0,n.jumpPressed=r,r=!1,n.trick=E(l)||D.trick?1:0,n.trickPressed=i,i=!1,n.zoom+=(n.zoomTo-n.zoom)*.16,!n.looking&&e-n.lastLook>1.2&&(n.lookYaw*=.94,n.lookPitch*=.94,Math.abs(n.lookYaw)<.001&&(n.lookYaw=0),Math.abs(n.lookPitch)<.001&&(n.lookPitch=0))},n.clear=()=>{t.clear(),r=!1,i=!1,n.lookYaw=0,n.lookPitch=0},n}var Fs={steeple:{label:`尖塔`,color:`#ffd76a`,icon:`M12 2 L8.6 11.5 H15.4 Z M9.9 11.5 V21.5 H14.1 V11.5 M14.1 15 H20.5 V21.5 H14.1`},cafe:{label:`夜间咖啡馆`,color:`#ff9166`,icon:`M5 9.5 H17 V14.5 A6 6 0 0 1 5 14.5 Z M17 11 H19 A2.5 2.5 0 0 1 19 16 H16.7 M4.5 21.5 H17.5 M9 6.8 V4.2 M13 6.8 V4.2`},gallery:{label:`画廊`,color:`#a9d4ff`,icon:`M4 4.5 H20 V19.5 H4 Z M7 16.5 L10.5 11.5 L13 14.5 L15 12.5 L17.5 16.5 Z M15.3 8.4 A1.3 1.3 0 1 0 17.9 8.4 A1.3 1.3 0 1 0 15.3 8.4`},square:{label:`市集广场`,color:`#ffbf66`,icon:`M3.5 20.5 H20.5 M6 20.5 V17 H18 V20.5 M12 17 V8.5 M12 8.5 C9.4 5 6.6 7.6 7.4 11.6 M12 8.5 C14.6 5 17.4 7.6 16.6 11.6`},view:{label:`观景点`,color:`#9be7b4`,icon:`M12 2 C8.4 7 7.4 13 9.5 18.5 H14.5 C16.6 13 15.6 7 12 2 Z M12 18.5 V22`}},Is=[`圣马丁`,`圣保罗`,`圣安娜`,`圣雷米`,`圣母院`,`圣特罗菲姆`,`圣玛尔特`,`圣朱利安`,`圣塞泽尔`,`圣克莱尔`,`圣罗克`,`圣奥诺拉`,`圣文森特`,`圣露西`],Ls=[`火车站咖啡馆`,`阿尔卡扎咖啡馆`,`广场咖啡馆`,`星辰咖啡馆`,`午夜咖啡馆`,`南方咖啡馆`,`拉马丁咖啡馆`,`友人咖啡馆`,`月亮咖啡馆`,`罗讷河咖啡馆`,`灯笼咖啡馆`,`台球咖啡馆`],Rs=[`鸢尾花画廊`,`向日葵画廊`,`杏树画廊`,`橄榄树画廊`,`柏树画廊`,`播种者画廊`,`麦田画廊`,`果园画廊`,`阿尔勒姑娘画廊`,`轻步兵画廊`,`收获画廊`,`桥畔画廊`],zs=[`古罗马广场`,`拉马丁广场`,`共和国广场`,`利塞广场`,`市场广场`,`香草广场`,`喷泉广场`,`伏尔泰广场`,`梧桐广场`,`南方广场`,`星空广场`,`水井广场`],Bs=new Map,Vs=[I(we.camGrid.gx),xt(we.camGrid.gz)];function Hs(e,t,n,r,i,a,o){return{key:`${e}:${t}:${n}`,type:e,name:a,i:t,j:n,gx:r,gz:i,wx:ft(r,i),wz:wt(r,i),y:Dt(r,i),...o}}function Us(e,t){let n=e*65536+t,r=Bs.get(n);if(r)return r;Bs.size>2e4&&Bs.clear(),r=[];let i=De(e,t),a=ht(Re(e,t,60606)),o=e=>e[Math.floor(a()*e.length)];if(i===`plaza`){let n=ge(e,t),i=e===0&&t===-1;if(n.church){let a=n.church;r.push(Hs(`steeple`,e,t,a.tx,a.tz,i?`教堂尖塔`:o(Is),{home:i,top:a.baseY+a.towerH+a.spireH,sx:(a.nave.x0+a.nave.x1)/2,sz:a.tz}))}else{let i=n.solids.find(e=>e.fountain),a=i?(i.x0+i.x1)/2:n.cx,s=i?(i.z0+i.z1)/2:n.cz;r.push(Hs(`square`,e,t,a,s,o(zs),{top:Dt(a,s)+9}))}}else if(i===`town`){let n=e===-1&&t===-1;if(n||ot(e,t,555)<.24){let i=ge(e,t).hall;if(i){let a=(i.x0+i.x1)/2;r.push(Hs(i.theme,e,t,a,i.zc,n?`夜之咖啡馆`:o(i.theme===`cafe`?Ls:Rs),{home:n,top:i.top+5}))}}}else if(e===Vs[0]&&t===Vs[1]){let{gx:n,gz:i}=we.camGrid;r.push(Hs(`view`,e,t,n,i,`画家小丘`,{home:!0,top:Dt(n,i)+10}))}return Bs.set(n,r),r}function Ws(e,t,n,r=[]){let i=I(e),a=xt(t);for(let e=i-n;e<=i+n;e++)for(let t=a-n;t<=a+n;t++){let n=Us(e,t);for(let e=0;e<n.length;e++)r.push(n[e])}return r}var Gs=160,Ks=[1,.84,.36],qs=[1,.93,.7],Js=[1,.92,.62],Ys=13,Xs=12,Zs=[1,.95,.8],Qs=[1,.42,.3],$s=[.8,.9,1],ec=[1,.8,.36],tc=new Map;function nc(e){let t=tc.get(e.key);if(t)return t;tc.size>400&&tc.clear(),t=[];let n=ht(Re(e.i,e.j,7313)),r=(r,i,a)=>t.push({gx:r,gz:i,y:Dt(r,i)+1.35+a,key:`${e.key}:${t.length}`,phase:n()*6.28,air:a>.5});if(e.type===`cafe`||e.type===`gallery`){let t=ge(e.i,e.j).hall,n=t.x1-t.x0;r(t.x0+n*.2,t.zc+2.7,0),r(t.x0+n*.62,t.zc-2.7,1),r(t.x0+n*.84,t.zc+2.5,0)}else if(e.type===`steeple`){let t=ge(e.i,e.j).church.nave,n=t.x1-t.x0;r(t.x0+n*.3,e.gz+2.5,0),r(t.x0+n*.56,e.gz-2.5,1.1),r(t.x0+n*.82,e.gz+2.5,0)}else{let t=e.type===`square`?4.6:3.8,i=n()*6.28;for(let n=0;n<3;n++){let a=i+n/3*6.28;r(e.gx+Math.cos(a)*t,e.gz+Math.sin(a)*t,n===1?1.1:0)}}return tc.set(e.key,t),t}function rc(e,t){let n=[],r=ht(Re(e,t,9917)),i=(i,a,o,s)=>n.push({gx:i,gz:a,y:o,key:`${e}:${t}:${s}`,phase:r()*6.28});for(let[n,r]of[[`x`,`a`],[`z`,`b`]]){let a=Se(n,e,t);if(a.arch){let e=(a.arch.a0+a.arch.a1)/2,[t,o]=n===`x`?[a.c,e]:[e,a.c];i(t,o,a.arch.top+1.3,r+`arch`)}}let a=ge(e,t);if(lt(a.kind)&&a.houses.length){let e=r()<.6?1:r()<.5?2:0;for(let t=0;t<e;t++){let e=a.houses[Math.floor(r()*a.houses.length)];if(e.church)continue;let n=(e.x0+e.x1)/2,o=(e.z0+e.z1)/2;i(n,o,_(e,n,o)+1.3,`r`+t)}}return n}function ic(e,t,n,r,i,a){let o=I(e),s=xt(t),c=null,l=1e9;for(let a=12;a<=42&&!c;a+=15)for(let u=o-a;u<=o+a;u++)for(let o=s-a;o<=s+a;o++){let a=Us(u,o);for(let o=0;o<a.length;o++){let s=a[o];if(i.has(s.key)||s.type!==`steeple`)continue;let u=s.gx-e,d=s.gz-t,f=Math.hypot(u,d);if(f<170)continue;let p=(u*n+d*r)/f,m=Math.abs(f-480)/480-p*.5;m<l&&(l=m,c=s)}}return c}function ac(e,t,n,r){if(e.type===`cafe`||e.type===`gallery`)return!!t.hall&&t.hall.key===`${e.i}:${e.j}`&&Math.abs(n-e.gx)<11;let i=Math.hypot(e.gx-n,e.gz-r);return e.type===`steeple`?Math.hypot(n-e.sx,r-e.sz)<2.5&&t.y<e.y+3.5:i<9.5&&!t.onRoof}var oc=e=>{let t=I(e+.01);return Math.abs(Xe(t)-e)<.5?t:t+1},sc=e=>{let t=xt(e+.01);return Math.abs(Ne(t)-e)<.5?t:t+1};function cc(e,t){let n=e.blk;if(e.type===`steeple`){let r=t>e.gx?n.i+1:n.i;return{entryI:r,ex:Xe(r),ez:e.gz,endX:e.sx}}let r=t>e.gx,i=r?n.i+1:n.i,a=e.type===`cafe`||e.type===`gallery`;return{entryI:i,ex:Xe(i),ez:a?n.hall.zc:nt(e.gz,n.z0+3,n.z1-3),endX:a?e.gx:e.gx+(r?3.6:-3.6)}}function lc(t,n,r,i,a){let o=i.blk,{entryI:s,ex:c,ez:l,endX:u}=cc(i,t),d=[],f=I(t),p=xt(n),m=Xe(f),h=Xe(f+1),g=Ne(p),_=Ne(p+1),v=t>m+e(f)&&t<h-e(f+1),y=n>g+U(p)&&n<_-U(p+1),b,x=t,S=n;if(!v&&y)b=`x`,x=t<=m+e(f)?m:h;else if(v&&!y)b=`z`,S=n<=g+U(p)?g:_;else if(!v&&!y)x=t<=m+e(f)?m:h,S=n<=g+U(p)?g:_,b=Math.abs(Math.sin(r))>Math.abs(Math.cos(r))?`x`:`z`;else{let e=t-m,r=h-t,i=n-g,a=_-n,o=Math.min(e,r,i,a);o===e||o===r?(b=`x`,x=o===e?m:h):(b=`z`,S=o===i?g:_)}d.push([x,S]);let C=Math.cos(r),w=Math.sin(r),T,E,D;if(b===`x`){T=oc(x);let e=xt(S),t=Ne(e),n=Ne(e+1),r=Math.abs(w)>.3?w>0:Math.abs(n-l)<Math.abs(t-l);E=r?e+1:e,D=r?1:-1}else{E=sc(S);let e=I(x),t=Xe(e),n=Xe(e+1),r=Math.abs(C)>.3?C>0:Math.abs(n-c)<Math.abs(t-c);T=r?e+1:e,D=r?1:-1}d.push([Xe(T),Ne(E)]);let O=s,k=Ne(E)<=l?o.j:o.j+1,A=b===`x`?`z`:`x`;b===`x`&&T===O&&Math.sign(k-E)===-D&&(T+=a()<.5?1:-1,d.push([Xe(T),Ne(E)]),A=`x`),b===`z`&&E===k&&Math.sign(O-T)===-D&&(E+=a()<.5?1:-1,d.push([Xe(T),Ne(E)]),A=`z`);let j=0;for(;(T!==O||E!==k)&&j++<120;)T===O?A=`x`:E===k&&(A=`z`),A===`z`?(T+=Math.sign(O-T)*Math.min(Math.abs(O-T),1+Math.floor(a()*2)),A=`x`):(E+=Math.sign(k-E)*Math.min(Math.abs(k-E),1+Math.floor(a()*2)),A=`z`),d.push([Xe(T),Ne(E)]);d.push([c,l]),d.push([u,l]);let ee=[d[0]];for(let e=1;e<d.length;e++){let t=d[e],n=ee[ee.length-1];Math.hypot(t[0]-n[0],t[1]-n[1])>1&&ee.push(t)}return dc(ee)}function uc(e,t){let n=e.blk,r=ge(-1,-1).hall,i=Xe(0),a=Xe(-1),o=Ne(n.j);if(r)return[[i,t],[i,o],[a,o],[a,r.zc],[i,r.zc],[n.church.tower.x0-6,e.gz],[e.sx,e.gz]];let{ex:s,ez:c,endX:l}=cc(e,i);return[[i,t],[i,o],[s,o],[s,c],[l,c]]}function dc(e){for(let t=1;t<e.length-2;t++){let n=e[t-1],r=e[t],i=e[t+1],a=e[t+2];if(Math.abs(r[1]-i[1])>.5||Math.abs(n[0]-r[0])>.5||Math.abs(a[0]-i[0])>.5)continue;let o=oc(r[0]),s=oc(i[0]);if(Math.abs(o-s)!==1)continue;let c=sc(r[1]);for(let e of[c-1,c]){let t=ge(Math.min(o,s),e).hall;if(!t)continue;let c=(n[1]-t.zc)*(t.zc-r[1])>=0&&Math.abs(n[1]-r[1])>1,l=(t.zc-a[1])*(r[1]-a[1])>=0;if(c&&l){r[1]=t.zc,i[1]=t.zc;break}}}return e}function fc(e){let t=[],n=Ys*1.6;for(let r=0;r<e.length-1;r++){let[i,a]=e[r],[o,s]=e[r+1],c=Math.hypot(o-i,s-a),l=n;for(;l<c;l+=Ys)t.push([i+(o-i)*l/c,a+(s-a)*l/c]);n=l-c}let r=e[e.length-1];t.push([r[0],r[1]]);let i=t;for(let e=0;e<2;e++){let e=i.map(e=>[e[0],e[1]]);for(let t=1;t<i.length-1;t++)e[t][0]=(i[t-1][0]+2*i[t][0]+i[t+1][0])/4,e[t][1]=(i[t-1][1]+2*i[t][1]+i[t+1][1])/4;i=e}let a=[],o=i.length,s=e=>{if(e<1||e>o-2)return 0;let t=i[e][0]-i[e-1][0],n=i[e][1]-i[e-1][1],r=i[e+1][0]-i[e][0],a=i[e+1][1]-i[e][1];return(t*r+n*a)/(Math.hypot(t,n)*Math.hypot(r,a)||1)},c=new Float32Array(o);for(let e=5;e<o-6;e+=6+e*7%3)s(e-1)>.995&&s(e)>.995&&s(e+1)>.995&&s(e+2)>.995&&(c[e]=1.6,c[e+1]=2.5,e+2<o-4&&(c[e+2]=1.6));for(let e=0;e<o;e++){let t=i[Math.max(0,e-1)],n=i[Math.min(o-1,e+1)],r=n[0]-t[0],s=n[1]-t[1],l=Math.hypot(r,s)||1,u=Math.sin(e*.9)*.8*Math.min(1,(o-1-e)/3)*(c[e]?.2:1),d=i[e][0]-s/l*u,f=i[e][1]+r/l*u,p=Dt(d,f)+1.15+c[e],m=c[e]>0,h=ge(I(d),xt(f)),g=h.church&&h.church.hall;g&&f>g.z0&&f<g.z1&&d>g.x0&&d<g.x1&&(p=Dt(d,f)+1.15,m=!1);let _=h.hall;if(_&&f>_.z0&&f<_.z1&&d>_.x0&&d<_.x1){p=Dt(d,f)+1.15,m=!1;for(let e of _.obstacles)d>e.x0-3.2&&d<e.x1+3.2&&f>e.z0-1.2&&f<e.z1+1.2&&(d=(e.x0+e.x1)/2,f=(e.z0+e.z1)/2,p=e.top+1.25,m=!0)}a.push({gx:d,gz:f,y:p,air:m,idx:e,taken:!1,phase:e*.7})}return a}function pc(e){let t=new Map,n=new Set,r=new Set,i=(e,n)=>{let r=e*65536+n,i=t.get(r);return i||(t.size>600&&t.clear(),i=rc(e,n),t.set(r,i)),i},a=new u,o=new Float32Array(1920),s=new Float32Array(1280),c=new Float32Array(2560),l=new Float32Array(1920),d=new Uint16Array(960);for(let e=0;e<Gs;e++){for(let t=0;t<4;t++){let n=e*4+t;s[n*2]=t===0||t===3?-1:1,s[n*2+1]=t<2?-1:1}d.set([e*4,e*4+1,e*4+2,e*4,e*4+2,e*4+3],e*6)}let f=new p(o,3),m=new p(c,4),h=new p(l,3);f.setUsage(xe),m.setUsage(xe),h.setUsage(xe),a.setAttribute(`position`,f),a.setAttribute(`aCorner`,new p(s,2)),a.setAttribute(`aGlow`,m),a.setAttribute(`color`,h),a.setIndex(new p(d,1));let g=new St(a,e);g.frustumCulled=!1,g.renderOrder=62;let _=0,v=(e,t,n,r,i,a,s,u)=>{if(_>=Gs)return;let d=_++;for(let f=0;f<4;f++){let p=d*4+f;o[p*3]=e,o[p*3+1]=t,o[p*3+2]=n,c[p*4]=r,c[p*4+1]=u,c[p*4+2]=s,c[p*4+3]=a,l[p*3]=i[0],l[p*3+1]=i[1],l[p*3+2]=i[2]}},y=[],b=(e,t,n,r,i=3,a=!1)=>{for(let o=0;o<r;o++){let r=Math.random()*6.28,o=Math.random()*2-.3,s=a?.6+Math.random()*1.6:2.5+Math.random()*4,c=a?.16+Math.random()*.16:.34+Math.random()*.26;y.push({x:e,y:t,z:n,vx:Math.cos(r)*s,vy:i+o*(a?1.2:4),vz:Math.sin(r)*s,life:c,life0:c,size:a?.1:.2})}},x={mesh:g,loose:[],burst:b,leg:0,target:null,visited:r,chosen:!1,trail:[],progress:0,lostFor:0,arrivedFor:-1,pendingNext:null,lastDir:[0,-1],info:{dist:0,bearing:0},prisms:[],prismTaken:new Set,prismCount(e){let t=0;for(let n of nc(e))x.prismTaken.has(n.key)&&t++;return t},emit(e,t,n,r=1,i=1){b(e,t,n,r,i,!0)},course:null,cleared:new Set,reset(){n.clear(),r.clear(),y.length=0,x.course=null,x.cleared.clear(),x.prismTaken.clear(),x.leg=0,x.target=null,x.trail=[],x.progress=0,x.arrivedFor=-1,x.lostFor=0,x.chosen=!1},setTarget(e,t,n=!1){let i=x.target;x.target={...e,blk:ge(e.i,e.j),tx:e.gx,tz:e.gz,tipY:e.top,seen:r.has(e.key)};let a=i?i.tx:t.gx,o=i?i.tz:t.gz,s=Math.hypot(e.gx-a,e.gz-o)||1;x.lastDir=[(e.gx-a)/s,(e.gz-o)/s],x.arrivedFor=-1,x.reroute(t,n)},reroute(e,t=!1){let n=ht(Re(Math.round(e.gx),Math.round(e.gz),31+x.leg)),r=t?uc(x.target,e.gz):lc(e.gx,e.gz,e.heading,x.target,n);x.trail=fc(r),x.progress=0,x.lostFor=0},start(e){x.leg++,x.arrivedFor=-1,x.chosen=!1;let t=Us(mc[0],mc[1])[0];if(x.leg===1)x.setTarget(t,e,!0),x.lastDir=[0,-1];else{let n=x.target?x.target.type:null;x.setTarget(ic(e.gx,e.gz,x.lastDir[0],x.lastDir[1],r,n)||t,e)}},choose(e,t){return x.target&&x.target.key===e.key&&x.arrivedFor<0?!1:(x.leg===0&&(x.leg=1),x.chosen=!0,x.setTarget(e,t),!0)},update(e,t,o,s){_=0;let c={orbs:0,strays:0,arrived:!1,found:null,side:0,prisms:0,prismAll:null},l=2+3.4*(o.hyperK||0),u=l*l,d=Math.cos(o.heading),p=Math.sin(o.heading);g.position.set(o.wx,0,o.wz);let S=o.gx,C=o.gz,w=o.y+1,T=C,E=I(S),D=xt(C);for(let e=E-2;e<=E+2;e++)for(let r=D-2;r<=D+2;r++)for(let a of i(e,r)){if(n.has(a.key))continue;let e=a.gx-S,r=a.gz-C,i=e*e+r*r;if(i>22500)continue;let l=a.y+.16*Math.sin(t*1.7+a.phase);s&&i<3.24&&Math.abs(l-w)<2.3?(n.add(a.key),c.strays++,b(ft(a.gx,a.gz),l,wt(a.gx,a.gz),16)):v(ft(a.gx,a.gz)-o.wx,l,wt(a.gx,a.gz)-o.wz,1.5,qs,2.4,2,a.phase)}let O=x.target;if(O&&x.arrivedFor<0){let n=x.trail,i=1e9;for(let e=x.progress;e<Math.min(n.length,x.progress+8);e++){let t=n[e],r=Math.hypot(t.gx-S,t.gz-C);r<i&&(i=r),r<10&&e>x.progress&&(x.progress=e)}let a=Math.max(0,x.progress-2),f=Math.min(n.length,x.progress+Xs);for(let e=a;e<f;e++){let r=n[e];if(r.taken)continue;let i=r.gx-S,a=r.gz-C,f=i*i+a*a,m=r.y+.14*Math.sin(t*2.1+r.phase);if(s&&f<u&&Math.abs(m-w)<(r.air?1.55:2.4)+(l-2)){r.taken=!0,c.orbs++,c.side=d*a-p*i>0?1:-1,e>x.progress&&(x.progress=e),b(ft(r.gx,r.gz),m,wt(r.gx,r.gz),7,2);continue}let h=e-x.progress,g=h<0?.3:1-.55*We(4,Xs,h),_=h>=0&&h<=1?1.12+.12*Math.sin(t*6):1;v(ft(r.gx,r.gz)-o.wx,m,wt(r.gx,r.gz)-o.wz,(r.air?.95:.8)*_,r.air?Zs:Ks,2*g*_,5,r.phase)}s&&(x.lostFor=i>70?x.lostFor+e:0,x.lostFor>2.5&&x.reroute(o));let m=Math.hypot(O.tx-S,O.tz-C);if(x.info.dist=m,x.info.bearing=Math.atan2(O.wz-o.wz,O.wx-o.wx),s&&ac(O,o,S,C)){c.arrived=!0,x.arrivedFor=0,r.add(O.key);for(let e of n)!e.taken&&Math.hypot(e.gx-O.tx,e.gz-O.tz)<60&&(e.taken=!0,b(ft(e.gx,e.gz),e.y,wt(e.gx,e.gz),5,6));for(let e=2;e<O.tipY-O.y;e+=2.2)b(O.wx,O.y+e,O.wz,5,9)}}else x.arrivedFor>=0&&(x.arrivedFor+=e);x.prisms.length=0;for(let e=E-2;e<=E+2;e++)for(let n=D-2;n<=D+2;n++){let r=Us(e,n);for(let e=0;e<r.length;e++){let n=r[e],i=nc(n);for(let e=0;e<i.length;e++){let r=i[e];if(x.prismTaken.has(r.key))continue;let a=r.gx-S,l=r.gz-T,u=a*a+l*l,d=r.y+.18*Math.sin(t*1.5+r.phase),f=ft(r.gx,r.gz),p=wt(r.gx,r.gz);s&&u<2.3*2.3&&Math.abs(d-w)<2.2?(x.prismTaken.add(r.key),c.prisms++,c.prismAt=n,b(f,d,p,26,4),x.prismCount(n)===i.length&&(c.prismAll=n)):u>28900||(x.prisms.push({wx:f,y:d,wz:p,phase:r.phase}),v(f-o.wx,d,p-o.wz,2.2,ec,1.25,2,r.phase))}}}if(s)for(let e=E-1;e<=E+1;e++)for(let t=D-1;t<=D+1;t++){let n=Us(e,t);for(let e=0;e<n.length;e++){let t=n[e];!r.has(t.key)&&ac(t,o,S,C)&&(r.add(t.key),c.found=t,b(t.wx,o.y+2.2,t.wz,14,5))}}let k=s?o.hall:null;if(k&&(!x.course||x.course.hall!==k)){let e=[];if(!x.cleared.has(k.key)){let t=(k.x1-k.x0)/7.6;for(let n=0;n<7;n++){let r=k.x0+t*(n+.8),i=k.obstacles.find(e=>Math.abs(r-(e.x0+e.x1)/2)<t*.55);if(i)e.push({gx:(i.x0+i.x1)/2,gz:(i.z0+i.z1)/2,y:i.top+1.25,air:!0,taken:!1,phase:n});else{let t=k.zc+(k.narrow&&r<k.narrow?0:n%2?2.4:-2.4);e.push({gx:r,gz:t,y:Dt(r,t)+1.15,air:!1,taken:!1,phase:n})}}}x.course={hall:k,orbs:e,got:0},c.course={entered:k.theme,fresh:e.length>0}}else if(!k&&x.course){let e=x.course;e.orbs.length&&(c.course={left:e.hall.theme,got:e.got,total:e.orbs.length}),x.course=null}if(x.course){let e=x.course,n=e.hall.theme===`cafe`?Qs:$s;for(let r of e.orbs){if(r.taken)continue;let i=r.gx-S,a=r.gz-C,s=r.y+.12*Math.sin(t*2.4+r.phase);i*i+a*a<4&&Math.abs(s-w)<(r.air?1.6:2.4)?(r.taken=!0,e.got++,c.courseOrbs=(c.courseOrbs||0)+1,b(ft(r.gx,r.gz),s,wt(r.gx,r.gz),9,2),e.got===e.orbs.length&&(x.cleared.add(e.hall.key),c.course={cleared:e.hall.theme})):v(ft(r.gx,r.gz)-o.wx,s,wt(r.gx,r.gz)-o.wz,.9,n,2.3,5,r.phase)}}if(O){let e=O.wx-o.wx,n=O.wz-o.wz,r=Math.hypot(e,n)||1,i=Math.min(1,380/r),a=We(380,760,r),s=(O.tipY+3.5)*(1-a)+(o.y+150)*a,c=1+.12*Math.sin(t*2.3)+(x.arrivedFor>=0?1.5*Math.exp(-x.arrivedFor*1.2):0);v(e*i,s,n*i,(7+6*a)*c,Js,3.2*c,4,.3)}for(let e of x.loose)v(e.x-o.wx,e.y,e.z-o.wz,.65,Ks,2,5,e.phase);for(let t=y.length-1;t>=0;t--){let n=y[t];if(n.life-=e,n.life<=0){y.splice(t,1);continue}n.vy+=7*e,n.x+=n.vx*e,n.y+=n.vy*e,n.z+=n.vz*e,n.vx*=1-2.5*e,n.vz*=1-2.5*e;let r=n.life/n.life0;v(n.x-o.wx,n.y,n.z-o.wz,n.size*(.3+.7*r),Ks,2.2*Math.min(1,r*1.5),3,0)}return y.length>220&&y.splice(0,y.length-220),a.setDrawRange(0,_*6),f.needsUpdate=!0,m.needsUpdate=!0,h.needsUpdate=!0,c}};return x}var mc=[0,-1],hc=e=>440*2**((e-69)/12),gc=[[38,57,61,64,66],[35,54,57,62,64],[31,54,59,62,66],[33,52,57,61,66]],_c=[62,64,66,69,71,74,76,78,81,83,86];function vc(){let e=null,t,n,r,i,a,o,s=!1;try{s=localStorage.getItem(`nightrider-muted`)===`1`}catch{}let c=0,l=0,u=0,d=0,f=null;function p(t){let n=Math.floor(e.sampleRate*t),r=e.createBuffer(2,n,e.sampleRate);for(let e=0;e<2;e++){let t=r.getChannelData(e);for(let e=0;e<n;e++){let r=e/n;t[e]=(Math.random()*2-1)*(1-r)**2.6*(1-Math.exp(-e/400))}}return r}function m(){if(e){e.state===`suspended`&&e.resume();return}let c=window.AudioContext||window.webkitAudioContext;if(!c)return;e=new c,t=e.createGain(),t.gain.value=s?0:.9;let d=e.createDynamicsCompressor();d.threshold.value=-16,d.ratio.value=3,t.connect(d).connect(e.destination);let m=e.createConvolver();m.buffer=p(3.6),n=e.createGain(),n.gain.value=.55,r=e.createGain(),r.gain.value=.75,n.connect(m).connect(t),r.connect(t),i=e.createBiquadFilter(),i.type=`lowpass`,i.frequency.value=1300,i.Q.value=.3,i.connect(n),i.connect(r),f=e.createBuffer(1,e.sampleRate*2,e.sampleRate);let h=f.getChannelData(0),g=0;for(let e=0;e<h.length;e++)g=g*.96+(Math.random()*2-1)*.2,h[e]=g;let _=e.createBufferSource();_.buffer=f,_.loop=!0,o=e.createBiquadFilter(),o.type=`bandpass`,o.frequency.value=500,o.Q.value=.7,a=e.createGain(),a.gain.value=0,_.connect(o).connect(a).connect(r),a.connect(n),_.start(),l=e.currentTime+.1,u=e.currentTime+2.5}function h(t,n,r,a,o=`sine`,s=i,c=2.2){let l=e.createOscillator(),u=e.createGain();l.type=o,l.frequency.value=t,l.detune.value=(Math.random()-.5)*9,u.gain.setValueAtTime(1e-4,n),u.gain.exponentialRampToValueAtTime(a,n+c),u.gain.setValueAtTime(a,n+Math.max(c,r-3.2)),u.gain.exponentialRampToValueAtTime(1e-4,n+r),l.connect(u).connect(s),l.start(n),l.stop(n+r+.1)}function g(t,i=.05,a=0){if(!e)return;let o=e.currentTime+a,s=e.createStereoPanner?e.createStereoPanner():null,c=e.createGain();c.gain.value=1,s?(s.pan.value=Math.random()*1.6-.8,c.connect(s),s.connect(n),s.connect(r)):(c.connect(n),c.connect(r));for(let[n,r,a]of[[1,1,2.6],[2.76,.28,1.2],[5.4,.1,.5]]){let s=e.createOscillator(),l=e.createGain();s.frequency.value=hc(t)*n,l.gain.setValueAtTime(1e-4,o),l.gain.exponentialRampToValueAtTime(i*r,o+.008),l.gain.exponentialRampToValueAtTime(1e-4,o+a),s.connect(l).connect(c),s.start(o),s.stop(o+a+.05)}}function _(t){if(!e)return;let n=e.currentTime,i=e.createOscillator(),a=e.createGain();i.frequency.setValueAtTime(110,n),i.frequency.exponentialRampToValueAtTime(42,n+.16),a.gain.setValueAtTime(Math.min(.5,.12+t*.03),n),a.gain.exponentialRampToValueAtTime(1e-4,n+.22),i.connect(a).connect(r),i.start(n),i.stop(n+.25)}function v(t){let n=e.currentTime,i=e.createBufferSource(),a=e.createBiquadFilter(),o=e.createGain();i.buffer=f,i.playbackRate.value=6,a.type=`highpass`,a.frequency.value=2600,o.gain.setValueAtTime(t,n),o.gain.exponentialRampToValueAtTime(1e-4,n+.02),i.connect(a).connect(o).connect(r),i.start(n,Math.random(),.03)}return{start:m,get muted(){return s},toggle(){s=!s;try{localStorage.setItem(`nightrider-muted`,s?`1`:`0`)}catch{}return e&&t.gain.setTargetAtTime(s?0:.9,e.currentTime,.08),s},update(t,n){if(!e||e.state!==`running`)return;let r=e.currentTime;r>=l&&(gc[c%gc.length].forEach((e,t)=>{h(hc(e),r,12.5,t===0?.055:.028,t===0?`sine`:`triangle`),t>0&&h(hc(e+12),r+.4,11.5,.007,`sine`)}),c++,l=r+9),r>=u&&(g(_c[Math.floor(Math.random()*_c.length)],.028+Math.random()*.02),Math.random()<.35&&g(_c[Math.floor(Math.random()*_c.length)],.02,.22+Math.random()*.3),u=r+1.4+Math.random()*3.4);let i=t.speed,s=Math.min(.045,i*i*16e-5)*n+(t.grounded?0:.01);a.gain.setTargetAtTime(s,r,.25),o.frequency.setTargetAtTime(380+i*42,r,.3),t.grounded&&!t.walking&&i>1.2&&r>=d&&(v(.016),d=r+1/(i*1.9))},orb(e){g(_c[Math.min(_c.length-1,(e-1)%10)]+(e>10?12:0),.085)},star(){g(78,.11),g(85,.08,.09),g(90,.06,.2)},arrive(){e&&([50,57,62].forEach((t,i)=>{let a=e.currentTime+i*.42;for(let[i,o,s]of[[1,.22,5.5],[2,.12,4],[2.76,.07,2.6],[5.4,.03,1.4]]){let c=e.createOscillator(),l=e.createGain();c.frequency.value=hc(t)*i,l.gain.setValueAtTime(1e-4,a),l.gain.exponentialRampToValueAtTime(o,a+.012),l.gain.exponentialRampToValueAtTime(1e-4,a+s),c.connect(l),l.connect(n),l.connect(r),c.start(a),c.stop(a+s+.1)}}),[74,78,81,86,90,93].forEach((e,t)=>g(e,.07,1.2+t*.11)))},wings(){[62,66,69,74,78,81,86,90,93,98].forEach((e,t)=>g(e,.075,t*.07))},fold(){[86,81,78,74,69,66].forEach((e,t)=>g(e,.045,t*.055))},flapSound(){if(!e)return;let t=e.currentTime,n=e.createBufferSource(),i=e.createBiquadFilter(),a=e.createGain();n.buffer=f,n.playbackRate.value=.9,i.type=`bandpass`,i.frequency.setValueAtTime(260,t),i.frequency.exponentialRampToValueAtTime(700,t+.22),i.Q.value=.6,a.gain.setValueAtTime(1e-4,t),a.gain.exponentialRampToValueAtTime(.16,t+.07),a.gain.exponentialRampToValueAtTime(1e-4,t+.3),n.connect(i).connect(a).connect(r),n.start(t,Math.random(),.34)},trick(e){let t=Math.min(7,2+Math.floor(e/220));for(let e=0;e<t;e++)g(_c[Math.min(_c.length-1,3+e)],.07,e*.055)},bail(){_(9),g(50,.05),g(51,.05,.05)},prism(){[78,83,86,90,95].forEach((e,t)=>g(e,.075,t*.035))},deliver(){[62,66,69,74,78,81,86].forEach((e,t)=>g(e,.08,.5+t*.09))},hyper(){if(!e)return;let t=e.currentTime,a=e.createBufferSource(),o=e.createBiquadFilter(),s=e.createGain();a.buffer=f,a.loop=!0,a.playbackRate.value=1.6,o.type=`bandpass`,o.Q.value=1.1,o.frequency.setValueAtTime(180,t),o.frequency.exponentialRampToValueAtTime(3200,t+.9),s.gain.setValueAtTime(1e-4,t),s.gain.exponentialRampToValueAtTime(.5,t+.5),s.gain.exponentialRampToValueAtTime(1e-4,t+1.6),a.connect(o).connect(s),s.connect(r),s.connect(n),a.start(t),a.stop(t+1.7),[50,57,62,66,69,74].forEach((e,n)=>h(hc(e+12),t+n*.05,3.4,.05,`sawtooth`,i,.25)),[86,90,93,98].forEach((e,t)=>g(e,.07,.45+t*.07))},land(e){e>3&&_(e)},bump(e){e>3.5&&_(e*.5)},jump(){e&&g(57,.03)}}}var yc={street:`#d6b876`,town:`#0e1945`,house:`#2c4494`,roofLine:`rgba(160, 190, 255, 0.20)`,plaza:`#b29a62`,grove:`#11393a`,field:`#57572a`,meadow:`#184a3f`,knoll:`#17454a`,olive:`#2f7c62`,cypress:`#0a2226`,water:`#8fd0ff`,hall:`#ffcf7a`},bc=205,xc=340,Sc=4,Cc=(e,t,n)=>e+(t-e)*n,wc=new Map;function Tc(e,t,n,r,i){e.moveTo(ft(t,n),wt(t,n)),e.lineTo(ft(r,n),wt(r,n)),e.lineTo(ft(r,i),wt(r,i)),e.lineTo(ft(t,i),wt(t,i)),e.closePath()}function Ec(e,t){let n=e*65536+t,r=wc.get(n);if(r)return r;wc.size>500&&wc.clear();let i=ge(e,t),a=new Path2D,o=[];for(let e=0;e<6;e++)o.push([Cc(i.x0,i.x1,e/6),i.z0]);for(let e=0;e<6;e++)o.push([i.x1,Cc(i.z0,i.z1,e/6)]);for(let e=0;e<6;e++)o.push([Cc(i.x1,i.x0,e/6),i.z1]);for(let e=0;e<6;e++)o.push([i.x0,Cc(i.z1,i.z0,e/6)]);if(o.forEach(([e,t],n)=>n?a.lineTo(ft(e,t),wt(e,t)):a.moveTo(ft(e,t),wt(e,t))),a.closePath(),r={kind:i.kind,ground:a,houses:null,ridges:null,hall:null,olives:null,cypresses:null,water:null},i.houses.length){r.houses=new Path2D,r.ridges=new Path2D;for(let e of i.houses){Tc(r.houses,e.x0,e.z0,e.x1,e.z1);let t=(e.x0+e.x1)/2,n=(e.z0+e.z1)/2,[i,a,o,s]=e.ridge===`x`?[e.x0+.8,n,e.x1-.8,n]:[t,e.z0+.8,t,e.z1-.8];r.ridges.moveTo(ft(i,a),wt(i,a)),r.ridges.lineTo(ft(o,s),wt(o,s))}}if(i.church){r.houses||(r.houses=new Path2D);let e=i.church.tower,t=i.church.nave;Tc(r.houses,e.x0,e.z0,e.x1,e.z1),r.hall=new Path2D,Tc(r.hall,e.x0-.5,i.church.tz-1.3,t.x1+.5,i.church.tz+1.3)}if(i.hall){let e=i.hall;r.hall=new Path2D,Tc(r.hall,e.x0-.5,e.zc-2.6,e.x1+.5,e.zc+2.6)}for(let e of i.trees){let t=e.kind===`olive`?`olives`:`cypresses`;r[t]||(r[t]=new Path2D);let n=ft(e.x,e.z),i=wt(e.x,e.z),a=e.kind===`olive`?Math.max(2.2,e.r*.95):2;r[t].moveTo(n+a,i),r[t].arc(n,i,a,0,6.2832)}let s=i.solids.find(e=>e.fountain);if(s){r.water=new Path2D;let e=ft((s.x0+s.x1)/2,(s.z0+s.z1)/2),t=wt((s.x0+s.x1)/2,(s.z0+s.z1)/2);r.water.arc(e,t,2.6,0,6.2832)}return wc.set(n,r),r}var Dc={};for(let e of Object.keys(Fs))Dc[e]=new Path2D(Fs[e].icon);var Oc=e=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${Fs[e].icon}"/></svg>`;function kc(e,{onPick:t,onNext:n}){e.innerHTML=`
    <div id="map-list"><div class="map-head"><span>地标</span><span class="map-key"><kbd>Tab</kbd> 下一个</span></div></div>
    <div id="map-disc"><canvas id="map-canvas"></canvas><div id="map-gloss"></div></div>`;let r=e.querySelector(`#map-list`),i=e.querySelector(`#map-disc`),a=e.querySelector(`#map-canvas`),o=a.getContext(`2d`),s=[];for(let e=0;e<Sc;e++){let n=document.createElement(`button`);n.type=`button`,n.className=`map-row`,n.innerHTML=`<span class="map-ico"></span><span class="map-text"><span class="map-name"></span><span class="map-kind"></span></span><span class="map-dist"></span><span class="map-arrow">↑</span>`,n.addEventListener(`click`,r=>{r.stopPropagation(),s[e].hl&&t(s[e].hl),n.blur()}),r.appendChild(n),s.push({el:n,hl:null,key:``,dist:``,ico:n.querySelector(`.map-ico`),name:n.querySelector(`.map-name`),kind:n.querySelector(`.map-kind`),distEl:n.querySelector(`.map-dist`),arrow:n.querySelector(`.map-arrow`)})}let c=0,l=1;function u(){let e=i.clientWidth||208,t=Math.min(window.devicePixelRatio||1,2);(e!==c||t!==l)&&(c=e,l=t,a.width=Math.round(e*t),a.height=Math.round(e*t))}window.addEventListener(`resize`,u);let d=bc,f=[],p=[],m=0,h=[],g=[];a.addEventListener(`click`,e=>{let r=a.getBoundingClientRect(),i=e.clientX-r.left,o=e.clientY-r.top,s=null,c=18;for(let e of h){let t=Math.hypot(e.x-i,e.y-o);t<c&&(c=t,s=e.hl)}s?t(s):n&&document.documentElement.classList.contains(`touch`)&&n()});function _(e,t){g.length=0,Ws(e.gx,e.gz,11,g);let n=t.target;for(let t of g)t._d=Math.hypot(t.wx-e.wx,t.wz-e.wz);g.sort((e,t)=>e._d-t._d),f=[],n&&f.push(n);for(let e of g){if(f.length>=Sc)break;n&&e.key===n.key||t.visited.has(e.key)||f.push(e)}p=g.filter(e=>e._d<1100).slice(0,14),n&&!p.some(e=>e.key===n.key)&&(n._d=Math.hypot(n.wx-e.wx,n.wz-e.wz),p.push(n))}return{el:e,get listed(){return f},cycle(e){if(f.length<2)return null;let t=e.target,n=t?f.findIndex(e=>e.key===t.key):-1;return f[(n+1)%f.length]},show(t){e.classList.toggle(`on`,t)},update(e,t,n,r,i,a,g=null){u(),m-=e,m<=0&&(m=.25,_(n,r)),d=G(d,n.flying?xc:bc,2.2,e);let v=r.target,y=c,b=y/2,x=b/d,S=Math.hypot(i,a)||1,C=i/S,w=a/S,T=-w*x,E=C*x,D=-C*x,O=-w*x,k=b-(T*n.wx+E*n.wz),A=b-(D*n.wx+O*n.wz),j=(e,t)=>T*e+E*t+k,ee=(e,t)=>D*e+O*t+A;o.setTransform(l,0,0,l,0,0),o.clearRect(0,0,y,y),o.save(),o.beginPath(),o.arc(b,b,b,0,6.2832),o.clip(),o.fillStyle=yc.street,o.fillRect(0,0,y,y),o.setTransform(l*T,l*D,l*E,l*O,l*k,l*A);let M=Math.ceil((d+40)/60),N=I(n.gx),te=xt(n.gz);for(let e=N-M;e<=N+M;e++)for(let t=te-M;t<=te+M;t++){let n=Ec(e,t);o.fillStyle=yc[n.kind],o.fill(n.ground),n.olives&&(o.fillStyle=yc.olive,o.fill(n.olives)),n.cypresses&&(o.fillStyle=yc.cypress,o.fill(n.cypresses)),n.houses&&(o.fillStyle=yc.house,o.fill(n.houses),n.ridges&&(o.strokeStyle=yc.roofLine,o.lineWidth=.9/x,o.stroke(n.ridges))),n.hall&&(o.fillStyle=yc.hall,o.fill(n.hall)),n.water&&(o.fillStyle=yc.water,o.fill(n.water))}if(v&&r.arrivedFor<0&&r.trail.length){o.beginPath(),o.moveTo(n.wx,n.wz);let e=r.trail;for(let t=Math.max(0,r.progress);t<e.length;t++)o.lineTo(ft(e[t].gx,e[t].gz),wt(e[t].gx,e[t].gz));o.lineJoin=`round`,o.lineCap=`round`,o.strokeStyle=`rgba(8, 10, 40, 0.75)`,o.lineWidth=4.6/x,o.setLineDash([]),o.stroke(),o.strokeStyle=`#fff1a6`,o.lineWidth=2.2/x,o.setLineDash([3.2/x,4.2/x]),o.lineDashOffset=-t*9/x,o.stroke(),o.setLineDash([])}o.setTransform(l,0,0,l,0,0);let ne=o.createRadialGradient(b,b,b*.35,b,b,b);ne.addColorStop(0,`rgba(6, 9, 40, 0)`),ne.addColorStop(1,`rgba(6, 9, 40, 0.55)`),o.fillStyle=ne,o.fillRect(0,0,y,y),h=[];let re=(e,n,r,i,a,s=1)=>{let c=Fs[e.type].color,l=(i?10.5:8.5)*s;if(o.globalAlpha=a&&!i?.5:1,i){let e=t*.9%1;o.strokeStyle=c,o.globalAlpha=.9*(1-e),o.lineWidth=1.6,o.beginPath(),o.arc(n,r,l+2+e*11,0,6.2832),o.stroke(),o.globalAlpha=1}o.beginPath(),o.arc(n,r,l,0,6.2832),o.fillStyle=`rgba(7, 10, 38, 0.94)`,o.fill(),o.strokeStyle=c,o.lineWidth=i?2:1.3,o.stroke();let u=l*1.26/24;o.save(),o.translate(n-12*u,r-12*u),o.scale(u,u),o.lineWidth=1.9,o.lineJoin=`round`,o.lineCap=`round`,o.strokeStyle=c,o.stroke(Dc[e.type]),o.restore(),o.globalAlpha=1,h.push({x:n,y:r,hl:e})},P=null;for(let e of p){let t=!!v&&e.key===v.key,n=j(e.wx,e.wz),i=ee(e.wx,e.wz);Math.hypot(n-b,i-b)>b-13||(t?P={h:e,x:n,y:i}:re(e,n,i,!1,r.visited.has(e.key)))}if(P&&re(P.h,P.x,P.y,!0,!1),g&&g.length){o.lineWidth=1.4,o.strokeStyle=`rgba(8, 10, 40, 0.95)`;for(let e of g){let t=j(e.wx,e.wz),n=ee(e.wx,e.wz),r=t-b,i=n-b,a=Math.hypot(r,i),s=b-6,c=a>s;c&&(t=b+r/a*s,n=b+i/a*s),o.globalAlpha=c?.55:1,o.beginPath(),o.arc(t,n,c?3:4,0,6.2832),o.fillStyle=e.color,o.fill(),o.stroke()}o.globalAlpha=1}{let e=Math.atan2(n.fz,n.fx)-Math.atan2(w,C);o.save(),o.translate(b,b),o.rotate(e),o.beginPath(),o.moveTo(0,-8.5),o.lineTo(6,6.5),o.lineTo(0,3.4),o.lineTo(-6,6.5),o.closePath(),o.fillStyle=`#fffbe6`,o.strokeStyle=`rgba(8, 10, 40, 0.95)`,o.lineWidth=1.6,o.lineJoin=`round`,o.shadowColor=`rgba(255, 220, 120, 0.9)`,o.shadowBlur=9,o.fill(),o.shadowBlur=0,o.stroke(),o.restore()}if(P){o.font=`600 10.5px ui-rounded, "SF Pro Rounded", -apple-system, "Segoe UI", system-ui, sans-serif`;let e=o.measureText(P.h.name).width,t=P.y<b+b*.45,n=P.y+(t?19:-19),r=Math.sqrt(Math.max(0,b*b-(n-b)*(n-b)))-6,i=Math.max(b-r,Math.min(b+r-e,P.x-e/2));o.textBaseline=`middle`,o.lineWidth=3.2,o.strokeStyle=`rgba(6, 9, 36, 0.92)`,o.lineJoin=`round`,o.strokeText(P.h.name,i,n),o.fillStyle=`#fff1c4`,o.fillText(P.h.name,i,n)}o.restore();for(let e of p){let t=!!v&&e.key===v.key,n=j(e.wx,e.wz)-b,i=ee(e.wx,e.wz)-b,a=Math.hypot(n,i);if(a<=b-13||r.visited.has(e.key)&&!t)continue;let s=n/a,c=i/a;if(t)re(e,b+s*(b-13),b+c*(b-13),!0,!1);else{let t=b+s*(b-5),n=b+c*(b-5);o.globalAlpha=.95-.5*Math.min(1,e._d/1100),o.fillStyle=Fs[e.type].color,o.beginPath(),o.moveTo(t+s*4.5,n+c*4.5),o.lineTo(t-s*3-c*3.6,n-c*3+s*3.6),o.lineTo(t-s*3+c*3.6,n-c*3-s*3.6),o.closePath(),o.fill(),o.globalAlpha=1}}{let e=Math.hypot(E,O)||1,t=-E/e,n=-O/e;o.font=`700 9.5px ui-rounded, "SF Pro Rounded", -apple-system, "Segoe UI", system-ui, sans-serif`,o.textAlign=`center`,o.textBaseline=`middle`;let r=b+t*(b-9),i=b+n*(b-9);o.fillStyle=`rgba(6, 9, 36, 0.85)`,o.beginPath(),o.arc(r,i,6.5,0,6.2832),o.fill(),o.fillStyle=`#ffe9a8`,o.fillText(`N`,r,i+.5),o.textAlign=`start`}for(let e=0;e<Sc;e++){let t=s[e],i=f[e];if(!i){t.hl&&(t.hl=null,t.key=``,t.el.classList.add(`off`));continue}let a=!!v&&i.key===v.key,o=r.prismCount(i),c=`${i.key}${a?`*`:``}${r.visited.has(i.key)?`v`:``}${o}`;if(t.key!==c){t.key=c,t.hl=i,t.el.classList.remove(`off`),t.el.classList.toggle(`dest`,a),t.el.style.setProperty(`--hl`,Fs[i.type].color),t.ico.innerHTML=Oc(i.type),t.name.textContent=i.name,t.kind.textContent=``;let e=document.createElement(`span`);e.className=`map-label`,e.textContent=a?`目的地`:Fs[i.type].label,t.kind.appendChild(e);let n=document.createElement(`span`);n.className=`map-pips`;for(let e=0;e<3;e++){let t=document.createElement(`i`);e<o&&(t.className=`got`),n.appendChild(t)}t.kind.appendChild(n)}let l=Math.hypot(i.wx-n.wx,i.wz-n.wz),u=a&&r.arrivedFor>=0?`此处`:l<995?`${Math.round(l/5)*5} 米`:`${(l/1e3).toFixed(1)} 公里`;t.dist!==u&&(t.dist=u,t.distEl.textContent=u);let d=Math.atan2(ee(i.wx,i.wz)-b,j(i.wx,i.wz)-b)+Math.PI/2;t.arrow.style.transform=`rotate(${d.toFixed(2)}rad)`}}}}function Ac(e,t=12){let n=new gt(64);n.reset(0,0,0,0);let r=.46;n.rgb(1,1,1).data(18,.5,1,0).noLamp();let i=[[r,0,0],[0,0,r],[-.46,0,0],[0,0,-.46]];for(let e=0;e<4;e++){let t=i[e],r=i[(e+1)%4];n.tri(n.pl(r[0],0,r[2]),n.pl(t[0],0,t[2]),n.pl(0,.66,0),0,0,1,0,.5,1),n.tri(n.pl(t[0],0,t[2]),n.pl(r[0],0,r[2]),n.pl(0,-.66,0),0,0,1,0,.5,1)}let a=n.build(),o=new Te,s=[];for(let n=0;n<t;n++){let t=new St(a,e);t.frustumCulled=!1,t.visible=!1,t.rotation.order=`YXZ`,o.add(t),s.push(t)}return{group:o,update(e,t){for(let n=0;n<s.length;n++){let r=s[n],i=e[n];r.visible=!!i,i&&(r.position.set(i.wx,i.y,i.wz),r.rotation.set(.1,t*1.1+i.phase,.07),r.scale.setScalar(1+.06*Math.sin(t*2.2+i.phase)))}}}}var jc=15e3;function Mc(e){let t=`/api/presence`,n=Math.random().toString(36).slice(2,12).padEnd(10,`0`)+Date.now().toString(36).slice(-4),r=0,i=[];async function a(){if(!document.hidden)try{let a=await fetch(t,{method:`POST`,headers:{"content-type":`application/json`},body:JSON.stringify({id:n,haul:r}),cache:`no-store`});if(!a.ok)return;let o=await a.json();if(typeof o.count!=`number`)return;i.push(Math.max(1,o.count)),i.length>2&&i.shift(),e({count:Math.max(...i),best:Math.max(o.best||0,r)})}catch{}}return a(),setInterval(a,jc),document.addEventListener(`visibilitychange`,()=>{document.hidden||a()}),window.addEventListener(`pagehide`,()=>{try{navigator.sendBeacon(t,JSON.stringify({id:n,bye:!0}))}catch{}}),{report(e){e>r&&(r=Math.floor(e),a())}}}var Nc=1/5,Pc=20,Fc=2e3,Ic=.35,Lc=.3,Rc=8,zc=3,Bc=1.7,Vc=1.6,Hc=.55,Uc=new i,Wc={h:0,s:0,l:0},Gc=(e,t,n)=>(Uc.setHSL(e/360,t,n,Be),[Uc.r,Uc.g,Uc.b]);function Kc(e,t,n=1){return Uc.setRGB(e[0],e[1],e[2]).getHSL(Wc,Be),Gc(t,Math.min(1,Wc.s*n),Wc.l)}function qc(e,t){let n=Math.imul(e^2654435769,2246822507)^Math.imul(t+1,3266489909);return n^=n>>>15,n=Math.imul(n,739982445),n^=n>>>12,n=Math.imul(n,695872825),n^=n>>>15,(n>>>0)/4294967296}var Jc=[[34,1],[28,.6],[215,.35],[20,.25],[45,.8]];function Yc(e,t){let n=qc(e,1)*360,r=(n+120+qc(e,2)*120)%360,i=qc(e,3)<.75?38+qc(e,4)*18:20+qc(e,4)*15,[a,o]=Jc[Math.floor(qc(e,5)*Jc.length)],s=i<36?.55:1;return{frame:Gc(t,.72,.5),smock:Kc(bo.smock,n),smockLight:Kc(bo.smockLight,n),smockDark:Kc(bo.smockDark,n),scarf:Kc(bo.scarf,r),hat:Kc(bo.hat,i,s),hatShade:Kc(bo.hatShade,i,s),trousers:Kc(bo.trousers,a,o)}}function Xc({scene:e,shared:t,paintMat:n,glowMat:r,url:i,models:a=8,groundAt:o,lampAt:s,onCount:c,status:l=()=>({}),onLost:u,onKnocked:d,onGot:f,onBump:p,onBumped:m,onSaid:h,onUnsaid:g}){let _={me:null,count:0,others:new Map,dots:[],loose:[],on:!1,update(){},close(){},say(){return!1},where(){return null}},v=new Map;if(!i)return _;let y=null,b=!1,x=1,S=0,C=0,w=!1,T=0;function E(){try{y=new WebSocket(i)}catch{y=null;return}y.onopen=()=>{b=!0,_.on=!0,x=1},y.onclose=()=>{b=!1,_.on=!1,y=null,S=performance.now()/1e3+x,x=Math.min(30,x*2)},y.onerror=()=>{},y.onmessage=e=>{let t;try{t=JSON.parse(e.data)}catch{return}if(t.t===`you`)_.me={id:t.id,hue:t.hue},F&&O&&performance.now()-F.t<15e3&&se(F.text),F=null;else if(t.t===`s`)D(t);else if(t.t===`bump`)M(t.a,t.v);else if(t.t===`said`)typeof t.text==`string`&&h?.(t.id,t.hue,t.text,!!_.me&&t.id===_.me.id);else if(t.t===`unsaid`)g?.();else if(t.t===`lost`)u?.(t.n,t.hue);else if(t.t===`knocked`)d?.(t.n,t.hue);else if(t.t===`got`){let e=v.get(t.orb);v.delete(t.orb),f?.(t.v,e||null)}}}function D(e){let t=performance.now()/1e3;if(typeof e.n==`number`&&e.n!==_.count&&(_.count=e.n,(_.onCount||c)?.(e.n)),Array.isArray(e.o)){let t=new Set;for(let[n,r,i,a]of e.o)t.add(n),v.has(n)||v.set(n,{id:n,gx:r,gz:a,x:ft(r,a),y:o(r,a)+.9,z:wt(r,a),phase:n*.618%1,askedT:0});for(let e of v.keys())t.has(e)||v.delete(e);_.loose.length=0;for(let e of v.values())_.loose.push(e)}if(Array.isArray(e.r))for(let n of e.r){if(!Array.isArray(n)||n.length!==16)continue;let[e,r,i]=n;if(_.me&&e===_.me.id||!(i>=0&&i<Fc))continue;let a=_.others.get(e);a||(a={id:e,hue:r,snaps:[],heardT:0,wheel:0,crank:0,stride:0,flap:0,park:null,model:null,d:0},_.others.set(e,a)),a.hue=r,a.heardT=t;let o=t-i/1e3,s=a.snaps[a.snaps.length-1];s&&o<s.t+.05||(a.snaps.push({t:o,s:n.slice(3)}),a.snaps.length>Rc&&a.snaps.shift())}}let O=null,k=(e,t,n,r,i)=>(r-e)*-Math.sin(n)+(i-t)*Math.cos(n)>=0?1:-1,A=e=>{let t=e.snaps[e.snaps.length-1].s;return e.gx===void 0?{gx:t[0],gz:t[1],h:t[3]}:{gx:e.gx,gz:e.gz,h:e.h}};function j(e,t,n){let r=A(e);e.shoveT=.5,e.shoveSide=k(r.gx,r.gz,r.h,t,n)}function ee(e,t,n){let r=A(e),i=r.gx-t,a=r.gz-n,o=Math.hypot(i,a)||1;e.wobbleT=.9,e.knockT=Hc,e.knockX=i/o,e.knockZ=a/o}function M(e,t){let n=_.me?_.me.id:-1;if(e===n||!O)return;let r=_.others.get(e),i=_.others.get(t);if(t===n){if(!r){m?.(1);return}let e=A(r);j(r,O.gx,O.gz),m?.(k(O.gx,O.gz,O.heading,e.gx,e.gz))}else if(i){let e=A(r||i);r&&j(r,A(i).gx,A(i).gz),ee(i,e.gx,e.gz)}}let N=[],ne=new te;function re(){for(let e of N)if(!e.rider)return e;if(N.length>=a)return null;let i=ds(t,n,r);i.root.visible=!1,e.add(i.root);let o={bike:i,rider:null,who:-1};return N.push(o),o}let P=Array(13);function ie(e,t){let n=e.snaps;if(!n.length)return null;let r=n[0],i=n[0];for(let e=0;e<n.length;e++){if(n[e].t<=t&&(r=n[e]),n[e].t>=t){i=n[e];break}i=n[e]}let a=i.t-r.t,o=a>1e-4?nt((t-r.t)/a,0,1):1;for(let e=0;e<13;e++){let t=r.s[e],n=i.s[e];e===3||e===8||e===9?P[e]=t+Le(t,n)*o:e===7||e===10||e===12?P[e]=o<.5?t:n:P[e]=t+(n-t)*o}let s=Math.min(Lc,t-i.t);return s>0&&P[7]&1&&(P[0]+=Math.cos(P[3])*P[4]*s,P[1]+=Math.sin(P[3])*P[4]*s),P}function ae(e){let t=l(),n=+!!e.grounded|(e.walking?2:0)|(e.wings?4:0)|(e.flying?8:0)|(t.theater?16:0);y.send(JSON.stringify([+e.gx.toFixed(2),+e.gz.toFixed(2),+e.y.toFixed(2),+e.heading.toFixed(3),+e.speed.toFixed(2),+e.steer.toFixed(3),+e.lean.toFixed(3),n,+(e.spin||0).toFixed(3),+(e.flip||0).toFixed(3),e.pose||0,Math.floor(t.carried||0),t.world||0]))}_.update=(e,t,r)=>{let i=performance.now()/1e3;if(O=t,w=r,!y&&w&&i>=S&&!document.hidden&&E(),T=r?0:T+e,y&&b&&T>Pc)try{y.close()}catch{}C-=e,b&&C<=0&&(C=Nc,r&&!document.hidden?ae(t):(y.send(`idle`),C=2));let o=i-Ic,c=[];for(let e of _.others.values()){let n=e.snaps[e.snaps.length-1],a=!n||i-e.heardT>zc;a||!r?(e.model&&=(e.model.rider=null,e.model.bike.root.visible=!1,null),a&&_.others.delete(e.id)):(e.d=Math.hypot(n.s[0]-t.gx,n.s[1]-t.gz),c.push(e))}c.sort((e,t)=>e.d-t.d),_.dots.length=0;for(let e of c){let t=e.snaps[e.snaps.length-1].s;e.dot||={wx:0,wz:0,color:`hsl(${e.hue}, 80%, 62%)`},e.dot.wx=e.model?e.model.bike.root.position.x:ft(t[0],t[1]),e.dot.wz=e.model?e.model.bike.root.position.z:wt(t[0],t[1]),_.dots.push(e.dot)}for(let e=a;e<c.length;e++){let t=c[e];t.model&&=(t.model.rider=null,t.model.bike.root.visible=!1,null)}for(let n=0;n<Math.min(a,c.length);n++){let r=c[n];if(!r.model){let e=re();if(!e)break;e.rider=r,r.model=e}r.model.who!==r.id&&(r.model.who=r.id,r.model.bike.setColors(Yc(r.id,r.hue))),oe(r,ie(r,o),e,t)}let u=r&&b?l():null;if(u&&!u.theater){let e=!t.grounded&&t.vy<0;for(let n of c){if(n.d>6||i<(n.bumpT||0))continue;let r=ie(n,o);if(!r||r[7]&16)continue;let a=Math.hypot(r[0]-t.gx,r[1]-t.gz);if(a>Bc||Math.abs(r[2]-t.y)>2.2)continue;let s=(r[0]-t.gx)/(a||1),c=(r[1]-t.gz)/(a||1),l=(Math.cos(t.heading)*s+Math.sin(t.heading)*c)*t.speed,u=-(Math.cos(r[3])*s+Math.sin(r[3])*c)*r[4];if(!(e||t.speed>3.2&&l+u>3&&l>=u-.5))continue;n.bumpT=i+1.5,ae(t),y.send(JSON.stringify({t:`hit`,id:n.id})),ee(n,t.gx,t.gz);let d=(t.gx+r[0])/2,f=(t.gz+r[1])/2;p?.(k(t.gx,t.gz,t.heading,r[0],r[1]),{x:ft(d,f),y:t.y+1,z:wt(d,f)})}for(let e of v.values())i-e.askedT<.8||Math.hypot(e.gx-t.gx,e.gz-t.gz)>Vc||Math.abs(e.y-.9-t.y)>2.5||(e.askedT=i,ae(t),y.send(JSON.stringify({t:`grab`,orb:e.id})))}N.length&&n.uniforms.uDynLamp.value.copy(s(t.gx,t.gz,ne))};function oe(e,t,n,r){if(!t)return;let[i,a,s,c,l,u,d,f,p,m,h]=t,g=!!(f&1),_=!!(f&2),v=ft(i,a),y=wt(i,a),b=Math.cos(c),x=Math.sin(c),S=ft(i+b*.5,a+x*.5)-v,C=wt(i+b*.5,a+x*.5)-y,w=Math.atan2(C,S);e.wheel+=l*n/xo,!_&&g&&l>.3&&(e.crank+=nt(l*.62,2,9)*n),_&&g&&(e.stride+=l*n*(Math.PI/2)/Math.min(.34,.2+.03*l)),f&8&&(e.flap+=n*4),_&&!e.park?e.park={x:v-C/Math.hypot(S,C)*.55,y:s,z:y+S/Math.hypot(S,C)*.55,yaw:-w,snap:!0}:_||(e.park=null);let T=e.model.bike;e.gx=i,e.gz=a,e.h=c,e.shoveT=Math.max(0,(e.shoveT||0)-n),e.wobbleT=Math.max(0,(e.wobbleT||0)-n),e.knockT=Math.max(0,(e.knockT||0)-n);let E=e.knockT>0?.75*Math.sin(Math.PI*(1-e.knockT/Hc)):0;T.root.visible=!0,T.root.position.set(v+(e.knockX||0)*E,s,y+(e.knockZ||0)*E),T.root.rotation.y=-w;let D=o(i,a);T.pose({wheel:e.wheel,crank:e.crank,steer:u,lean:d,pitch:0,bob:0,air:+!g,speed:Math.abs(l),dt:n,wings:f&4?1:0,flying:!!(f&8),flap:e.flap,spin:p,flip:m,trickPose:h,grab:e.shoveT>0?e.shoveSide:0,bail:e.wobbleT>0,walk:_,stride:e.stride,park:e.park}),e.park&&(e.park.snap=!1),T.shadow.position.y=g?.03:-(s-D)+.03}let F=null,se=e=>{ae(O),y.send(JSON.stringify({t:`say`,text:e}))};return _.say=e=>(e=String(e).slice(0,200),b&&O?se(e):F={text:e,t:performance.now()},!0),_.where=(e,t)=>{let n=_.others.get(e);if(!n||!n.snaps.length)return null;if(n.model&&n.model.bike.root.visible){let e=n.model.bike.root.position;return t.set(e.x,e.y+2.25,e.z)}let r=n.snaps[n.snaps.length-1].s;return t.set(ft(r[0],r[1]),r[2]+2.25,wt(r[0],r[1]))},_.close=()=>{if(w=!1,y)try{y.close()}catch{}},_}var Zc=6.5,Qc=10;function $c({box:e,layer:t,camera:n,shared:r,where:i,send:a,onOpen:o,onMute:s}){let c=e.querySelector(`input`),l=new Map,u=new Set,d=new W,f={open:!1,muted:u},p=c.placeholder,m=null;f.show=(t,n=null)=>{t&&(m=n,c.placeholder=n?.hint||p),f.aside=t&&!!n,f.open!==t&&(f.open=t,e.classList.toggle(`on`,t),t?(c.value=``,c.focus({preventScroll:!0})):c.blur(),o?.(t))};for(let e of[`keydown`,`keyup`,`keypress`])c.addEventListener(e,t=>{t.stopPropagation(),e===`keydown`&&t.key===`Escape`&&(t.preventDefault(),f.show(!1))});return e.addEventListener(`submit`,e=>{e.preventDefault();let t=c.value.trim();t&&(m?.send||a)(t),f.show(!1)}),c.addEventListener(`blur`,()=>{f.open&&f.show(!1)}),f.heard=(e,n,r,i=!1,a={})=>{if(u.has(e))return;let o=l.get(e);if(r===null)o&&(o.el.remove(),l.delete(e));else{if(i||=!!a.plain,!o){if(l.size>=Qc){let[e,t]=l.entries().next().value;t.el.remove(),l.delete(e)}let n=document.createElement(`button`);n.type=`button`,n.className=`bubble`,i?n.classList.add(`mine`):(n.title=`点击不再收听这位骑手`,n.addEventListener(`click`,()=>{u.add(e),n.remove(),l.delete(e),s?.()})),t.appendChild(n),o={el:n,t:0},l.set(e,o)}if(o.el.textContent!==r){o.el.textContent=r;let e=o.el.style.transform;o.el.style.transform=`none`,o.el.style.width=``;let t=document.createRange();t.selectNodeContents(o.el);let n=t.getBoundingClientRect().width,i=getComputedStyle(o.el);n>0&&(o.el.style.width=`${Math.ceil(n+parseFloat(i.paddingLeft)+parseFloat(i.paddingRight))+1}px`),o.el.style.transform=e}o.el.style.setProperty(`--hue`,n),o.el.classList.remove(`going`),o.el.classList.toggle(`waiting`,!!a.wait),o.kept=!!a.plain&&!a.passing,o.t=a.hold||Zc}},f.refused=()=>{},f.update=(e,t,a)=>{for(let[o,s]of l){if(s.t-=e,s.t<=0){s.el.remove(),l.delete(o);continue}s.t<.6&&s.el.classList.add(`going`);let c=i(o,d);if(!c){s.el.style.display=`none`;continue}let u=c.x-n.position.x,f=c.z-n.position.z;c.y+=r.uBend.value*(u*u+f*f);let p=Math.hypot(u,f);if(c.project(n),(c.z>1||c.z<-1||Math.abs(c.x)>1.1||Math.abs(c.y)>1.1)&&!s.kept){s.el.style.display=`none`;continue}s.el.style.display=``;let m=(c.x*.5+.5)*t,h=(-c.y*.5+.5)*a,g=Math.max(.62,Math.min(1,14/Math.max(p,1)));s.kept&&((c.z>1||c.z<-1)&&(m=t/2,h=a*.34),m=Math.max(150,Math.min(t-150,m)),h=Math.max(96,Math.min(a*.72,h)),g=Math.max(g,.9)),s.el.style.transform=`translate(-50%, -100%) translate(${m.toFixed(1)}px, ${h.toFixed(1)}px) scale(${g.toFixed(3)})`}},f.clear=()=>{for(let e of l.values())e.el.remove();l.clear()},f}var el=6.5,tl=16,nl=12,rl=17,il=8,al=2.5,ol=.6,sl=11,cl=`hails`,ll=30,ul={postman:`邮差`,waiter:`侍者`,patron:`咖啡馆老板`,painter:`画家`,zouave:`士兵`,gent:`绅士`,lady:`女士`,arlesienne:`阿尔勒女士`,worker:`工人`},dl={lamplighting:`点灯人`,fiddling:`小提琴手`,selling:`摊贩`},fl=e=>dl[e.doing]||ul[e.kind]||`某个人`;function pl({world:e,time:t,town:n,show:r,seen:i,quiet:a,onNear:o,onError:s,onUnheard:c,url:l=`/api/talk`}){let u={near:null,with:null,busy:!1},d=new Map,f=new Map,p={x:0,y:0,z:0},m=0,h=null,g=null,_=-2.5,v=0,y=0,b=0,x=0,S=!1,C=()=>{S||(S=!0,c?.())},w=new Map,T=e=>`npc:${e}`;u.update=(n,s,c,l=!1)=>{if(b+=n,m-=n,m>0)return;m=.15;let d=t(),f=c&&Math.abs(s.speed)<rl?e.personNear(s.wx,s.wz,s.y,el,d):null;if(u.with){let t=Math.hypot(e.personAt(u.with.p,d,p).x-s.wx,p.z-s.wz);!c||t>tl||!u.busy&&!l&&b-y>ll?(u.with=null,e.hold(null)):f&&f.cid===u.with.cid||(f=u.engaged()||l||t<el*1.6?u.with:f)}u.near=f;let x=f?fl(f.p):null;x!==h&&(h=x,o?.(x));let S=!c||Math.abs(s.speed)>=rl?null:e.personNear(s.wx,s.wz,s.y,sl,d,(e,t)=>w.has(e)&&b-w.get(e)<=nl?(w.set(e,b),!1):!i||i(t.x,t.y+1.7,t.z));if(S&&!u.with&&!u.busy&&!l&&b-_>al&&b>v+ol){f=S,w.delete(f.cid),w.set(f.cid,b),w.size>400&&w.delete(w.keys().next().value),_=b;let e=Wt(Gt(f.p.kind,f.p.seed)),t=T(f.cid);E(t,f.p);let n=Math.max(2.6,Math.min(6,e.text.split(/\s+/).length*.36+1.2));r(t,e.text,{hold:n,passing:!0}),v=b+n-1,a()?C():(D(`${cl}/${e.clip}.mp3`,.9),g.addEventListener(`ended`,()=>{v=Math.min(v,b)},{once:!0}))}},u.engaged=()=>u.busy||b<x,u.facing=n=>u.with?(e.personAt(u.with.p,t(),p),n.x=p.x,n.y=p.y,n.z=p.z,n):null,u.leave=()=>{!u.busy&&b>=x&&u.with&&(u.with=null,e.hold(null))};let E=(e,t)=>{f.set(e,t),f.size>40&&f.delete(f.keys().next().value)};function D(e,t){try{g?.pause()}catch{}g=new Audio(e),g.volume=t,g.play().catch(()=>{})}function O(e,t,n,i){D(`${l}?speak=${encodeURIComponent(e)}`,.95);let a=g;a.addEventListener(`playing`,()=>{r(t,n,{hold:i+6}),y=b+i,x=b+Math.min(i+3,16)},{once:!0}),a.addEventListener(`ended`,()=>{r(t,n,{hold:1.4}),y=b,x=b},{once:!0}),a.addEventListener(`error`,()=>{x=Math.min(x,b+1)},{once:!0})}return u.begin=()=>{let n=u.near;return n?(u.with&&u.with.cid===n.cid||(u.with=n,e.hold(n.p,t())),y=b,!0):!1},u.where=(n,r)=>{let i=f.get(n);return i?(e.personAt(i,t(),p),r.set(p.x,p.y+(i.tall||1.7)+.42,p.z)):null},u.say=async i=>{let o=u.with||u.near;if(!o||u.busy)return!1;u.with&&u.with.cid===o.cid||(u.with=o,e.hold(o.p,t())),u.busy=!0,y=b;let c=T(o.cid);E(c,o.p);let f=d.get(o.cid)||[];r(c,`…`,{hold:12,wait:!0});try{let e=await fetch(l,{method:`POST`,headers:{"content-type":`application/json`},body:JSON.stringify({who:{kind:o.p.kind,seed:o.p.seed,doing:o.p.doing},say:i,history:f,town:n(),voice:!a()})}),t=await e.json().catch(()=>({}));if(!e.ok||!t.text)return r(c,null),s?.(t.message||`他们似乎没有听见。`),!1;for(f.push({by:`rider`,text:i},{by:`villager`,text:t.text});f.length>il;)f.shift();d.set(o.cid,f),d.size>60&&d.delete(d.keys().next().value);let u=Math.max(4.5,Math.min(16,t.text.split(/\s+/).length*.42+1.5));return r(c,t.text,{hold:u}),y=b+u,x=b+Math.min(u,9),t.speak&&!a()?O(t.speak,c,t.text,u):a()&&C(),!0}catch{return r(c,null),s?.(`他们似乎没有听见。`),!1}finally{u.busy=!1}},u.hush=()=>{try{g?.pause()}catch{}u.with=null,e.hold(null)},u}new W(0,1,0);var ml=()=>{window.va||(window.va=function(...e){window.vaq||(window.vaq=[]),window.vaq.push(e)})},hl=`@vercel/analytics`,gl=`2.0.1`;function _l(){return typeof window<`u`}function vl(){return`production`}function yl(e=`auto`){e===`auto`?window.vam=vl():window.vam=e}function bl(){return(_l()?window.vam:vl())||`production`}function xl(){return bl()===`production`}function Sl(){return bl()===`development`}function Cl(e,{[e]:t,...n}){return n}function wl(e,t){if(!e)return;let n=e,r=[];for(let[i,a]of Object.entries(e))typeof a==`object`&&a&&(t.strip?n=Cl(i,n):r.push(i));if(r.length>0&&!t.strip)throw Error(`The following properties are not valid: ${r.join(`, `)}. Only strings, numbers, booleans, and null are allowed.`);return n}function Tl(e){return e.scriptSrc?Dl(e.scriptSrc):Sl()?`https://va.vercel-scripts.com/v1/script.debug.js`:e.basePath?Dl(`${e.basePath}/insights/script.js`):`/_vercel/insights/script.js`}function El(e,t){let n=e;if(t)try{n={...JSON.parse(t)?.analytics,...e}}catch{}yl(n.mode);let r={sdkn:hl+(n.framework?`/${n.framework}`:``),sdkv:gl};return n.disableAutoTrack&&(r.disableAutoTrack=`1`),n.viewEndpoint&&(r.viewEndpoint=Dl(n.viewEndpoint)),n.eventEndpoint&&(r.eventEndpoint=Dl(n.eventEndpoint)),n.sessionEndpoint&&(r.sessionEndpoint=Dl(n.sessionEndpoint)),Sl()&&n.debug===!1&&(r.debug=`false`),n.dsn&&(r.dsn=n.dsn),n.endpoint?r.endpoint=n.endpoint:n.basePath&&(r.endpoint=Dl(`${n.basePath}/insights`)),{beforeSend:n.beforeSend,src:Tl(n),dataset:r}}function Dl(e){return e.startsWith(`http://`)||e.startsWith(`https://`)||e.startsWith(`/`)?e:`/${e}`}function Ol(e={debug:!0},t){var n;if(!_l())return;let{beforeSend:r,src:i,dataset:a}=El(e,t);if(ml(),r&&((n=window.va)==null||n.call(window,`beforeSend`,r)),document.head.querySelector(`script[src*="${i}"]`))return;let o=document.createElement(`script`);o.src=i;for(let[e,t]of Object.entries(a))o.dataset[e]=t;o.defer=!0,o.onerror=()=>{let e=Sl()?`Please check if any ad blockers are enabled and try again.`:`Be sure to enable Web Analytics for your project and deploy again. See https://vercel.com/docs/analytics/quickstart for more information.`;console.log(`[Vercel Web Analytics] Failed to load script from ${i}. ${e}`)},document.head.appendChild(o)}function kl(e,t,n){var r,i;if(!_l()){let e="[Vercel Web Analytics] Please import `track` from `@vercel/analytics/server` when using this function in a server environment";if(xl())console.warn(e);else throw Error(e)}else if(!t)(r=window.va)==null||r.call(window,`event`,{name:e,options:n});else try{let r=wl(t,{strip:xl()});(i=window.va)==null||i.call(window,`event`,{name:e,data:r,options:n})}catch(e){e instanceof Error&&Sl()&&console.error(e)}}var Al=!1;function jl(){if(!Al){Al=!0;try{Ol()}catch{}}}function Ml(e,t){if(Al)try{kl(e,t)}catch{}}var Nl=`/api/leaderboard`,Pl=e=>document.getElementById(e),Fl=e=>fetch(Nl,{method:`POST`,headers:{"content-type":`application/json`},body:JSON.stringify(e),cache:`no-store`}),Il=new Map;function Ll(e){let t=document.createElement(`span`);t.className=`pic`,t.textContent=(e.handle.replace(/_/g,``)[0]||`@`).toUpperCase();let n=e.handle.toLowerCase(),r=Il.get(n);if(r===!1)return t;let i=r?[r]:[];r||(e.avatar&&i.push(e.avatar.replace(/_400x400(\.\w+)$/,`_bigger$1`)),i.push(`https://unavatar.io/x/${encodeURIComponent(e.handle)}?fallback=false`));let a=new Image;return a.alt=``,a.decoding=`async`,a.referrerPolicy=`no-referrer`,a.onload=()=>{Il.set(n,a.src),t.appendChild(a)},a.onerror=()=>{let e=i.shift();e?a.src=e:Il.set(n,!1)},a.src=i.shift(),t}function Rl({onAgain:e,onResume:t,onTop:n}){let r=Pl(`board`),i=null,a=0,o=`view`,s=``,c=!1,l=-1e9,u=0;try{Pl(`board-handle`).value=localStorage.getItem(`nightrider-handle`)||``}catch{}function d(e,t){let r=Pl(`board-list`);r.textContent=``,e.slice(0,25).forEach((e,t)=>{let n=document.createElement(`li`);s&&e.handle.toLowerCase()===s.toLowerCase()&&(n.className=`me`);let i=document.createElement(`a`);i.className=`row-link`,i.href=`https://x.com/${encodeURIComponent(e.handle)}`,i.target=`_blank`,i.rel=`noopener noreferrer`,i.title=`在 X 上查看 @${e.handle}`;let a=document.createElement(`span`);a.className=`rank`,a.textContent=String(t+1);let o=document.createElement(`span`);o.className=`who`,o.textContent=`@${e.handle}`;let c=document.createElement(`span`);c.className=`pts`,c.textContent=Number(e.score).toLocaleString(),i.append(a,Ll(e),o,c),n.appendChild(i),r.appendChild(n)}),Pl(`board-empty`).classList.toggle(`hidden`,e.length>0),Pl(`board-count`).textContent=t>e.length?`榜上有 ${t.toLocaleString()} 位骑手`:``,e.length&&n&&n(Number(e[0].score))}async function f(){if(performance.now()-l<9e4)return!0;try{let e=await fetch(Nl,{cache:`no-store`});if(!e.ok)return!1;let t=await e.json();return d(t.top||[],t.count||0),!0}catch{return!1}}function p(e,t=!1){let n=Pl(`board-msg`);n.textContent=e,n.classList.toggle(`bad`,t)}async function m(){if(c||o!==`finish`)return;let e=Pl(`board-handle`).value.trim().replace(/^@+/,``);if(!/^[A-Za-z0-9_]{1,15}$/.test(e))p(`X 账号为 1–15 个字母、数字或下划线。`,!0),Pl(`board-handle`).focus();else{c=!0,Pl(`board-post`).disabled=!0,p(`发布中…`);try{i||await g.start();let t=await Fl({handle:e,score:a,token:i}),n=await t.json().catch(()=>({}));if(!t.ok||!n.ok){p(n.message||`分数发布失败，请稍后再试。`,!0);return}s=n.handle,l=performance.now(),Ml(`score_posted`,{score:a}),Pl(`board-handle`).value=s;try{localStorage.setItem(`nightrider-handle`,s)}catch{}d(n.top||[],n.count||0),p(n.best>a?`已发布。你的最高分仍是 ${n.best.toLocaleString()} — 当前排名第 ${n.rank}。`:`已发布 — 当前排名第 ${n.rank}。`),r.classList.add(`posted`)}catch{p(`无法连接排行榜。请检查网络后重试。`,!0)}finally{c=!1,Pl(`board-post`).disabled=!1}}}let h=()=>o===`finish`?t():g.close();Pl(`board-form`).addEventListener(`submit`,e=>{e.preventDefault(),m()}),Pl(`board-again`).addEventListener(`click`,()=>{g.close(),e()}),Pl(`board-back`).addEventListener(`click`,h),r.addEventListener(`click`,e=>{e.target===r&&o===`view`&&g.close()}),Pl(`board-handle`).addEventListener(`keydown`,e=>{e.stopPropagation(),e.key===`Escape`&&h()}),Pl(`board-handle`).addEventListener(`keyup`,e=>e.stopPropagation());let g={get open(){return!r.classList.contains(`hidden`)},async start(){let e=++u;i=null;for(let t=0;t<4&&e===u;t++){try{let t=await Fl({action:`start`});if(t.ok){let n=(await t.json()).token;n&&e===u&&(i=n)}}catch{}if(i)return;await new Promise(e=>setTimeout(e,4e3))}},refresh:f,show(e,t=0){o=e,a=Math.max(0,Math.floor(t)),r.classList.remove(`hidden`,`posted`),r.classList.toggle(`finish`,o===`finish`),Pl(`board-score`).textContent=a.toLocaleString(),Pl(`board-title`).textContent=o===`finish`?`骑行结束`:`排行榜`,Pl(`board-back`).textContent=o===`finish`?`继续骑行`:`关闭`,p(``),f(),o===`finish`&&setTimeout(()=>Pl(`board-handle`).focus(),60)},close(){r.classList.add(`hidden`)}};return f(),setInterval(()=>{document.hidden||f()},12e4),g}var zl=1.25,Bl=5.2,Vl=2.1,Hl=`
attribute float aPart;
uniform float uBend;
uniform vec3 uBendCenter;
varying vec2 vUv;
varying float vPart;
varying vec3 vN;
varying vec3 vW;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vN = normal;
  vec2 dxz = wp.xz - uBendCenter.xz;
  wp.y += uBend * dot(dxz, dxz);            // (the valley curls up with distance, like everything else in it)
  vUv = uv;
  vPart = aPart;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,Ul=`
precision highp float;
uniform float uTime;
uniform float uAlive;
uniform float uGain;
varying vec2 vUv;
varying float vPart;
varying vec3 vN;
varying vec3 vW;
void main() {
  vec3 gold = vec3(1.0, 0.66, 0.16);
  float a, cover;
  if (vPart < 0.5) {
    // the shaft: lit dust, brightest where the eye looks through most of it
    vec2 v = normalize(cameraPosition.xz - vW.xz);
    float thick = pow(abs(dot(normalize(vN.xz), v)), 1.25);
    float up = vUv.y;
    float fall = pow(1.0 - up, 0.8) * smoothstep(0.0, 0.03, up);
    float th = vUv.x * 6.2831853;
    float s1 = 0.5 + 0.5 * sin(th * 5.0 + up * 7.0 - uTime * 2.6);
    float s2 = 0.5 + 0.5 * sin(th * 9.0 - up * 11.0 + uTime * 1.7);
    float motes = pow(0.5 + 0.5 * sin(th * 17.0 + up * 31.0 - uTime * 4.0), 8.0);
    float heart = pow(thick, 5.0);                       // a white-hot core down the middle
    a = thick * fall * (0.62 + 0.38 * s1 * s2 + 0.6 * motes);
    gold = mix(gold, vec3(1.0, 0.93, 0.66), 0.75 * heart * fall);
    a *= 1.0 + 1.1 * heart;
    cover = 0.5;
  } else {
    // the rosette on the floor: two rings, eight turning petals, a hot heart
    float r = length(vUv);
    if (r > 1.0) discard;
    float th = atan(vUv.y, vUv.x);
    float ring = smoothstep(0.075, 0.0, abs(r - 0.9)) + 0.8 * smoothstep(0.05, 0.0, abs(r - 0.62 - 0.035 * sin(uTime * 2.2)));
    float petals = pow(abs(cos(th * 4.0 + uTime * 0.45)), 5.0) * smoothstep(0.9, 0.34, r) * smoothstep(0.06, 0.3, r) * 0.7;
    float rays = pow(abs(cos(th * 4.0 - uTime * 0.3 + 0.39)), 30.0) * smoothstep(0.62, 0.2, r) * 0.6;
    float core = exp(-r * r * 5.0) * 1.1;
    float wash = smoothstep(1.0, 0.5, r) * 0.22;         // the pool of light it stands in
    a = ring + petals + rays + core + wash;
    cover = 0.62;
  }
  // (laid over the picture rather than only added to it: on the pale stone of
  // a nave a purely additive light would not read as gold at all)
  float k = mix(0.25, 1.0, uAlive);
  gl_FragColor = vec4(gold * a * 2.1 * uGain * k, clamp(a * cover, 0.0, 0.9) * k);
}
`;function Wl(e){let t=[],n=[],r=[],i=[],a=[];for(let e=0;e<=40;e++){let a=e/40*Math.PI*2,o=Math.cos(a),s=Math.sin(a);t.push(o*zl,.02,s*zl,o*zl*.82,Bl,s*zl*.82),n.push(o,0,s,o,0,s),r.push(e/40,0,e/40,1),i.push(0,0)}for(let e=0;e<40;e++){let t=e*2;a.push(t,t+1,t+2,t+2,t+1,t+3)}let o=t.length/3;for(let[e,a]of[[-1,-1],[1,-1],[1,1],[-1,1]])t.push(e*Vl,.05,a*Vl),n.push(0,1,0),r.push(e,a),i.push(1);a.push(o,o+1,o+2,o,o+2,o+3);let s=new u;s.setAttribute(`position`,new y(t,3)),s.setAttribute(`normal`,new y(n,3)),s.setAttribute(`uv`,new y(r,2)),s.setAttribute(`aPart`,new y(i,1)),s.setIndex(a);let c={value:1},l=new qe({vertexShader:Hl,fragmentShader:Ul,uniforms:{uTime:e.uTime,uBend:e.uBend,uBendCenter:e.uBendCenter,uAlive:e.uAlive,uGain:c},blending:5,blendEquation:100,blendSrc:201,blendDst:205,depthWrite:!1,transparent:!0,side:2}),d=new St(s,l);d.frustumCulled=!1,d.renderOrder=61,d.visible=!1;let f=null,p=0,m=0,h=!1,g=0,_=[],v={at:null,entered:!1,near:!1};return{group:d,update(e,t){if(m-=e,m<=0){m=.4,_.length=0,Ws(t.gx,t.gz,3,_);let e=null,n=1e9;for(let r of _){if(r.type!==`steeple`)continue;let i=Math.hypot(r.gx-t.gx,r.gz-t.gz);i<n&&(n=i,e=r)}e&&(!f||e.key!==f.key)?(f=e,p=Dt(f.sx,f.sz),d.position.set(ft(f.sx,f.sz),p,wt(f.sx,f.sz)),h=!1):e||(f=null),d.visible=!!f}if(v.at=f,v.entered=!1,v.near=!1,f){let n=t.gx-f.sx,r=t.gz-f.sz,i=t.y<p+3.5,a=n*n+r*r<6.25&&i;v.entered=a&&!h,h=a,v.near=i&&n*n+r*r<49,g=G(g,+!!a,a?12:1.6,e)}return c.value=1+1.3*g,v}}}var Gl=new URLSearchParams(location.search),Y=e=>document.getElementById(e),Kl=`./`;function ql(e){let t=Y(`fatal`);t.textContent=e,t.classList.remove(`hidden`),Y(`loading`).classList.add(`done`)}var Jl=Y(`gl`),Yl;try{Yl=new na({canvas:Jl,antialias:!1,alpha:!1,depth:!1,stencil:!1,powerPreference:`high-performance`})}catch(e){throw ql(`这幅画需要 WebGL 2 — 你的浏览器未能启动它。`),e}Yl.outputColorSpace=yt,Yl.autoClear=!1,Yl.setClearColor(0,1);var Xl=ra(),Zl=new at,Ql=new Ke(60,1,.25,2600);Ql.rotation.order=`YXZ`;var $l=va(Xl);Zl.add($l.mesh);var eu=Na(Xl);Zl.add(eu.group),Xl.uMoonDir.value.copy($l.moonDir);var tu=new to(Yl),nu=new jt,ru=(e,{mips:t=!0}={})=>new Promise((n,r)=>{nu.load(Kl+e,e=>{e.colorSpace=``,e.wrapS=e.wrapT=et,e.generateMipmaps=t,e.minFilter=t?Tt:H,e.magFilter=H,e.anisotropy=t?Yl.capabilities.getMaxAnisotropy():1,n(e)},void 0,()=>r(Error(`无法加载 ${e}`)))}),iu,au,ou,su,cu;try{[iu,au,ou,su,cu]=await Promise.all([ru(fo.small?`painting-s.webp`:`painting.webp`),ru(fo.small?`sky-s.webp`:`sky.webp`),ru(`flow.png`,{mips:!1}),ru(`cypress.png`),ru(`fill.png`)])}catch(e){throw ql(`画布加载失败，请检查网络连接后刷新。`),e}$l.setCanvas(au,ou,cu),Xl.tCanvas.value=iu,tu.composite.uniforms.tPainting.value=iu;var lu=Ka(Xl,iu,su);Zl.add(lu);var uu=io(Xl),du=io(Xl,{dynamic:!0}),fu=co(Xl),pu=new _o(Zl,uu,fu,io(Xl,{walker:!0}));tu.depthMaterial=fo.touch?null:ao(Xl);var X=new js,mu=ds(Xl,du,fu);Zl.add(mu.root);var hu=null,gu=Xc({scene:Zl,shared:Xl,glowMat:fu,paintMat:io(Xl,{dynamic:!0}),url:zt,models:fo.touch?5:8,groundAt:(e,t)=>X.groundAt(e,t),lampAt:(e,t,n)=>pu.nearestLamp(e,t,n),status:()=>({theater:Z.theater,carried:Q.points,world:0}),onLost:(e,t)=>{Q.points=Math.max(0,Q.points-e),Eu.burst(X.wx,X.y+1.1,X.wz,16),$u(`${Cu(t,!0)}骑手撞掉了 ${e.toLocaleString()} 颗光球 — 快追回来！`,3800),Ml(`knocked_loose`,{n:e})},onKnocked:(e,t)=>{$.cheerT=1.2,$u(`你从${Cu(t)}骑手身上撞掉了 ${e.toLocaleString()} 颗光球 — 快捡回来！`,3400),Ml(`knock`,{n:e})},onBump:(e,t)=>{$.grabT=.45,$.grabSide=e,wu.shake=Math.max(wu.shake,.5),Du.bump(9),Eu.burst(t.x,t.y,t.z,9)},onBumped:e=>{X.bail=Math.max(X.bail,.8),X.speed*=.75,X.heading-=e*.16,wu.shake=Math.max(wu.shake,.85),Du.bail(),Eu.burst(X.wx,X.y+1,X.wz,12)},onSaid:(e,t,n,r)=>{vu.heard(r?_u:e,t,n,r),r||Du.jump()},onUnsaid:()=>$u(`这句话没能传出去`,2600),onGot:(e,t)=>{Q.points+=e;let n=Y(`stars`);n.classList.add(`on`,`bump`),setTimeout(()=>n.classList.remove(`bump`),160),Du.orb(++Q.streak),Q.streakT=3.4,t&&Eu.burst(t.x,t.y,t.z,7)}}),_u=-1,vu=$c({box:Y(`chat`),layer:Y(`bubbles`),camera:Ql,shared:Xl,where:(e,t)=>e===_u?t.set(X.wx,X.y+2.25,X.wz):typeof e==`string`?Su.where(e,t):gu.where(e,t),send:e=>{Z.joined=!0,gu.say(e)?Ml(`chat`):$u(`暂时联系不上其他骑手`,2600)},onOpen:e=>{if(Y(`hud`).classList.toggle(`chatting`,e),!e)Su.leave();else{Tu.clear();for(let e of document.querySelectorAll(`#hint kbd.down`))e.classList.remove(`down`)}},onMute:()=>$u(`本次骑行中你不会再听到这位骑手`,3e3)}),yu=[],bu=new W,xu=[`北`,`东北`,`东`,`东南`,`南`,`西南`,`西`,`西北`],Su=pl({world:pu,time:()=>Z.time,quiet:()=>Du.muted,town:()=>{yu.length=0,Ws(X.gx,X.gz,5,yu);for(let e of yu)e._m=Math.hypot(e.wx-X.wx,e.wz-X.wz);return{sights:yu.sort((e,t)=>e._m-t._m).slice(0,5).map(e=>({name:e.name,type:e.type,m:Math.round(e._m),way:xu[Math.round(Math.atan2(e.wx-X.wx,-(e.wz-X.wz))/(Math.PI/4)+8)%8]})),going:Eu.target?Eu.target.name:``,carried:Math.round(Q.points),others:Math.max(0,gu.count-1)}},show:(e,t,n={})=>vu.heard(e,42,t,!1,{...n,plain:!0}),onNear:e=>{Y(`talk-tip`).classList.toggle(`on`,!1),e&&(Y(`talk-who`).textContent=`与${e}交谈`)},onError:e=>$u(e,3e3),onUnheard:()=>$u(`声音已关闭 — 按 M 聆听镇民说话`,4200),seen:(e,t,n)=>{let r=e-Ql.position.x,i=n-Ql.position.z;return bu.set(e,t+Xl.uBend.value*(r*r+i*i),n).project(Ql),bu.z>-1&&bu.z<1&&Math.abs(bu.x)<.86&&bu.y>-.9&&bu.y<.8}});{Y(`btn-chat`).style.display=`none`,document.querySelector(`#hint [data-code="Enter"]`)?.remove();let e=document.querySelector(`#hint [data-code="KeyR"]`);e&&(e.classList.add(`blank`),delete e.dataset.code)}function Cu(e){for(let[t,n]of[[15,`红色`],[40,`橙色`],[65,`黄色`],[150,`绿色`],[190,`青色`],[250,`蓝色`],[290,`紫色`],[335,`粉色`],[360,`红色`]])if(e<t)return n;return`红色`}var wu=new Ns,Tu=Ps(Jl),Eu=pc(fu);Zl.add(Eu.mesh);var Du=vc(),Ou=Ac(du);Zl.add(Ou.group);var ku=Wl(Xl);Zl.add(ku.group);var Au=kc(Y(`map`),{onPick:e=>Sd(e),onNext:()=>{let e=Au.cycle(Eu);e&&Sd(e)}}),Z={state:`title`,doneT:0,time:0,diveT:0,rideT:0,titleMix:1,alive:0,reveal:0,quality:nt(parseFloat(Gl.get(`q`)||`1`),.4,2),view:{W:1,H:1,hole:{cx:0,cy:0,w:1,h:1}},loading:!0},ju={pos:new W(we.camWorld.x,we.camY,we.camWorld.z),yaw:0,pitch:B.pitch};lu.position.copy(ju.pos),lu.rotation.order=`YXZ`,lu.rotation.set(ju.pitch,ju.yaw,0);var Mu=new W(0,Math.sin(B.pitch),-Math.cos(B.pitch)),Nu={gx:we.church.gx,gz:we.church.gz-60};function Pu(){let e=window.innerWidth,t=window.innerHeight;Z.view.W=e,Z.view.H=t;let n=Math.sqrt((fo.touch?17e5:33e5)/(e*t)),r=Math.min(window.devicePixelRatio||1,n,2)*Z.quality;Yl.setPixelRatio(r),Yl.setSize(e,t,!1),tu.setSize(e*r,t*r);let i=nt(t*.2,128,190),a=Math.min(t*.95-i,t*.78),o=a*B.aspect;o>e*.86&&(o=e*.86,a=o/B.aspect);let s=nt(o*.034,10,34);a-=2*s,o=a*B.aspect;let c=a+2*s+i,l=Math.max(t*.03,(t-c)/2),u=e/2,d=l+s+a/2;Z.view.hole={cx:u,cy:d,w:o,h:a,b:s},tu.composite.uniforms.uHole.value.set((u-o/2)/e,1-(d+a/2)/t,(u+o/2)/e,1-(d-a/2)/t);let f=e=>`${e.toFixed(1)}px`,p={l:u-o/2-s,t:d-a/2-s,w:o+2*s,h:a+2*s},m=Y(`frame`),h=Y(`frame-shadow`),g=Y(`frame-lip`),_=Y(`wall`),v=Y(`plaque`);for(let e of[m,h])e.style.left=f(p.l),e.style.top=f(p.t),e.style.width=f(p.w),e.style.height=f(p.h);m.style.borderWidth=f(s),g.style.left=f(u-o/2),g.style.top=f(d-a/2),g.style.width=f(o),g.style.height=f(a),_.style.transformOrigin=`${f(u)} ${f(d)}`;let y=p.l+p.w,b=p.t+p.h;_.style.clipPath=`polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${f(p.l)} ${f(p.t)}, ${f(p.l)} ${f(b)}, ${f(y)} ${f(b)}, ${f(y)} ${f(p.t)}, ${f(p.l)} ${f(p.t)})`,v.style.top=f(b+nt(t*.026,12,28))}function Fu(e,t){let{W:n,H:r}=Z.view,i=2*Math.max(t,r-t);Ql.fov=2*Math.atan(i/2/e)/Vt,Ql.aspect=n/i,Math.abs(i-r)<.5?Ql.clearViewOffset():Ql.setViewOffset(n,i,0,i/2-t,n,r),Ql.updateProjectionMatrix()}var Iu=()=>Z.view.hole.h/2/B.tanV,Lu=e=>Z.view.H/2/Math.tan(e*Vt/2);window.addEventListener(`resize`,Pu),Pu();var Ru=.15,zu=8.2,Bu=12,Vu=45;function Hu(){if(Z.state!==`title`||Z.loading)return;Z.state=`dive`,Z.diveT=0,Z.joined=!1;let e=Y(`gallery`);e.classList.add(`leaving`),clearTimeout(Gu),Gu=setTimeout(()=>{(Z.state===`dive`||Z.state===`ride`)&&e.classList.add(`gone`)},2100),X.reset(),X.auto=!0,X.autoSpeed=0,wu.snap(X),Tu.clear(),Du.start(),Dd.start(),Ml(`ride_start`,{device:fo.small?`phone`:fo.touch?`tablet`:`desktop`}),td(),Eu.reset(),Eu.start({gx:X.gx,gz:ld,heading:X.heading}),Y(`guide-label`).textContent=Eu.target.name}var Uu=2.1,Wu={top:new W,far:!0,speed:0,stage:0},Gu=0;function Ku(){if(Z.state===`ride`||Z.state===`done`||Z.state===`dive`){if(Dd.close(),Yu(),Z.theater&&yd(!1),Y(`hud`).classList.add(`hidden`),clearTimeout(Gu),Z.state===`dive`)Wu.top.copy(ju.pos),Wu.far=!1,Wu.speed=0;else{let e=X.gx,t=X.gz+62;Wu.top.set(ft(e,t),Math.max(Dt(e,t)+20,X.y+26),wt(e,t)),Wu.far=!0,Wu.speed=Math.min(X.speed,fs),Z.diveT=8.35}Wu.stage=0,X.auto=!0,Tu.clear(),Z.state=`rise`}}function qu(){Z.state=`title`,Z.titleMix=1,Z.alive=0,Z.reveal=0,Y(`gallery`).classList.remove(`gone`,`leaving`),X.reset(),X.auto=!0,X.autoSpeed=0,Tu.clear(),Eu.reset(),td()}function Ju(){$.finishT=14,$.briefT=0,Y(`brief`).classList.remove(`on`),Y(`finish-score`).textContent=Q.banked.toLocaleString(),Y(`finish`).classList.add(`on`)}function Yu(){$.finishT=0,Y(`finish`).classList.remove(`on`),document.activeElement&&document.activeElement!==document.body&&document.activeElement.blur()}function Xu(){Z.state===`ride`&&(Ml(`ride_finish`,{score:Math.round(Q.banked),minutes:Math.round(Z.rideT/6)/10}),Z.state=`done`,Z.doneT=0,X.auto=!0,X.autoSpeed=0,Tu.clear(),Yu(),Y(`hud`).classList.add(`hidden`),Du.arrive(),Dd.show(`finish`,Q.banked))}function Zu(){Dd.close(),Z.state===`done`&&(Z.state=`ride`,X.auto=!1,Tu.clear(),Tu.lookYaw=jd.lookYaw,Tu.lookPitch=jd.lookPitch,Tu.lastLook=-10,Y(`hud`).classList.remove(`hidden`))}Y(`finish-yes`).addEventListener(`click`,Xu),Y(`finish-no`).addEventListener(`click`,Yu),Y(`open-board`).addEventListener(`click`,()=>Dd.show(`view`)),Y(`enter`).addEventListener(`click`,Hu),Jl.addEventListener(`click`,()=>{Z.state===`title`&&Hu()}),Y(`btn-gallery`).addEventListener(`click`,Ku),window.addEventListener(`keydown`,e=>{Z.state===`realm`||(Dd.open?e.code===`Escape`&&(Z.state===`done`?Zu():Dd.close()):(e.code===`Enter`&&Z.state===`title`?Hu():e.code===`Enter`&&Z.state===`ride`&&$.finishT>0&&Xu(),e.code===`Escape`&&(Z.state===`ride`&&$.finishT>0?Yu():Ku())))});var Qu=0;function $u(e,t=4200,n=!1){if(Z.theater&&!n)return;let r=Y(`toast`);r.textContent=e,r.classList.add(`on`),clearTimeout(Qu),Qu=setTimeout(()=>r.classList.remove(`on`),t)}var Q={points:0,shown:0,banked:0,bankShown:0,caught:0,streak:0,streakT:0,mult:1,strayToast:!1,meter:0,skyGain:1},$={cheerT:0,grabT:0,grabSide:0,look:0,trickT:0,briefT:0,finishT:0,hints:{}},ed={fill:``,mult:0,dist:``,hl:``};function td(){Object.assign(Q,{points:0,shown:0,banked:0,bankShown:0,caught:0,streak:0,streakT:0,mult:1,meter:0}),Y(`star-count`).textContent=`0`,Y(`bank-count`).textContent=`0`,ed.mult=0;for(let e of[`stars`,`mult`,`guide`,`bank`,`hyper`,`trick`,`brief`,`finish`])Y(e).classList.remove(`on`,`live`);$.finishT=0,nd()}function nd(){let e=Math.min(Q.caught,160);Q.skyGain=1+e*.0045,Xl.uGlow.value=1+e*.002}function rd(e){Q.points+=Math.round(e*(X.hyper>0?2:1));let t=Y(`stars`);t.classList.add(`on`,`bump`),setTimeout(()=>t.classList.remove(`bump`),160)}function id(e){X.hyper<=0&&(Q.meter=Math.min(1,Q.meter+e))}function ad(e,t,n=``){let r=Y(`trick`);Y(`trick-name`).textContent=e,Y(`trick-points`).textContent=t,r.className=`on ${n}`,$.trickT=n===`live`?.25:2.6}function od(e,t,n){$.hints[e]||($.hints[e]=!0,$u(t,n))}function sd(e,t){let n=Q.points;Q.banked+=n+t,Q.points=0,Y(`bank`).classList.add(`on`),Du.deliver(),$.cheerT=1.8,Ed.report(Q.banked);let r=e.home?`《星月夜》的教堂尖塔`:`${e.name}的教堂尖塔`;$u(n>0?`已把 ${n.toLocaleString()} 颗光球送进 ${r}${t?`  +${t}`:``}`:`已抵达 ${r}${t?`  +${t}`:``}`,5600)}function cd(){Y(`btn-sound`).classList.toggle(`off`,Du.muted)}Y(`btn-sound`).addEventListener(`click`,()=>{Du.toggle(),cd()}),window.addEventListener(`keydown`,e=>{e.code===`KeyM`&&(Du.toggle(),cd())}),window.addEventListener(`keydown`,e=>{e.code===`Enter`&&!e.repeat&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&Z.state===`ride`&&$.finishT<=0&&!Dd.open&&e.preventDefault()}),Y(`btn-chat`).addEventListener(`pointerdown`,e=>e.preventDefault()),window.addEventListener(`keydown`,e=>{e.code!==`KeyR`||e.repeat||e.metaKey||e.ctrlKey||e.altKey||e.preventDefault()}),Y(`talk-tip`).addEventListener(`pointerdown`,e=>e.preventDefault()),Y(`talk-tip`).addEventListener(`click`,()=>void 0),Y(`btn-chat`).addEventListener(`click`,()=>{vu.open&&vu.show(!1)});{let e={ArrowUp:`KeyW`,ArrowLeft:`KeyA`,ArrowDown:`KeyS`,ArrowRight:`KeyD`,ShiftLeft:`KeyE`,ShiftRight:`KeyE`},t=new Map;for(let e of document.querySelectorAll(`#hint [data-code]`))t.set(e.dataset.code,e);let n=(n,r)=>{if(r&&vu.open)return;let i=t.get(e[n.code]||n.code);i&&i.classList.toggle(`down`,r)};window.addEventListener(`keydown`,e=>{n(e,!0),e.code!==`KeyH`||e.repeat||e.metaKey||e.ctrlKey||e.altKey||Z.state!==`ride`||(clearTimeout(Md),Y(`hint`).classList.toggle(`faded`))}),window.addEventListener(`keyup`,e=>n(e,!1)),window.addEventListener(`blur`,()=>{for(let e of t.values())e.classList.remove(`down`)})}cd();var ld=10,ud=[],dd=0;function fd(){if(Z.state!==`ride`||X.wings||X.walking)return;let e=performance.now();for(ud.push(e);ud.length&&e-ud[0]>1100;)ud.shift();ud.length>=3&&(ud.length=0,X.wings=!0,X.takeOff(11),Du.wings(),Ml(`wings`),$u(`翼展！按住空格飞行`,5200))}window.addEventListener(`keydown`,e=>{e.code===`Space`&&!e.repeat&&fd()}),Y(`pad-jump`).addEventListener(`pointerdown`,()=>fd()),Tu.onLeap=()=>{Z.state===`title`&&!Dd.open?Hu():fd()};var pd=!1;function md(){pd||Z.state!==`ride`||(pd=!0,Ml(`controller`),$u(`手柄 — A 跳跃（连按 3 次起飞）· RT 蹬踏 · LT 刹车 · X 特技 · B 步行 · Y 影院`,6500,!0))}window.addEventListener(`gamepadconnected`,()=>md());var hd=new W,gd=!1;function _d(){Z.state!==`ride`||Dd.open||$.finishT>0||X.setWalking(!X.walking)&&(Y(`btn-walk`).classList.toggle(`on`,X.walking),X.walking&&!gd&&(gd=!0,Ml(`on_foot`),$u(fo.touch?`步行中 — 再按同一按钮上车`:`步行中 — E 跑步 · 对着墙跳跃并按住 W 攀爬 · F 上车`,4600)))}window.addEventListener(`keydown`,e=>{e.code!==`KeyF`||e.repeat||e.metaKey||e.ctrlKey||e.altKey||_d()}),Y(`btn-walk`).addEventListener(`click`,e=>{_d(),e.currentTarget.blur()});var vd=0;function yd(e){Z.theater=e,Y(`hud`).classList.toggle(`theater`,e),Y(`btn-theater`).classList.toggle(`on`,e),Eu.mesh.visible=Ou.group.visible=ku.group.visible=!e,e?(Yu(),$.briefT=0,Y(`brief`).classList.remove(`on`),Ml(`theater`),$u(fo.touch?`影院模式 — 轻触月亮返回游戏`:`影院模式 — 按 T 返回游戏`,3200,!0)):Y(`toast`).classList.remove(`on`)}function bd(){Z.state===`ride`&&!Dd.open&&yd(!Z.theater)}window.addEventListener(`keydown`,e=>{e.code!==`KeyT`||e.repeat||e.metaKey||e.ctrlKey||e.altKey||Dd.open||bd()}),Y(`btn-theater`).addEventListener(`click`,e=>{bd(),e.currentTarget.blur()}),window.addEventListener(`mousemove`,()=>{Z.theater&&(Y(`hud`).classList.add(`peek`),clearTimeout(vd),vd=setTimeout(()=>Y(`hud`).classList.remove(`peek`),2200))});var xd=e=>e.type===`steeple`&&!e.home?`${e.name}的教堂尖塔`:e.name;function Sd(e){Z.state===`ride`&&Eu.choose(e,X)&&(Y(`guide-label`).textContent=e.name,$u(`去往 ${xd(e)} — 跟着光球走`,3400),Du.jump())}window.addEventListener(`keydown`,e=>{if(e.code!==`Tab`||Dd.open||(e.preventDefault(),Z.state!==`ride`||e.repeat))return;let t=Au.cycle(Eu);t&&Sd(t)});function Cd(e){let t=Z.state===`ride`&&!Z.theater,n=Eu.update(e,Z.time,X,t);if(n.orbs){for(let e=0;e<n.orbs;e++)Q.streak++,Q.mult=Math.min(5,1+Math.floor(Q.streak/6)),rd(10*Q.mult),Du.orb(Q.streak),Q.streak%12==0&&($.cheerT=.9);Q.caught+=n.orbs,Q.streakT=3.4,id(.014*n.orbs),$.grabT=.2,$.grabSide=n.side,nd()}if(n.strays&&(rd(50*Q.mult*n.strays),Q.caught+=3*n.strays,Q.streak+=2,Q.streakT=3.4,id(.07*n.strays),Du.star(),nd(),Q.strayToast||(Q.strayToast=!0,$u(`屋顶边拾到一颗星光  +50`))),n.prisms&&(rd(150*Q.mult*n.prisms),Q.caught+=5*n.prisms,Q.streakT=3.4,id(.16*n.prisms),Du.prism(),$.cheerT=.8,nd(),n.prismAll?(rd(400),$u(`${n.prismAll.name} — 三块棱镜集齐  +400`,4200)):$u(`一块棱镜  +${150*Q.mult}`,2400)),n.arrived){let e=Eu.target,t=e.seen?0:e.type===`steeple`?500*Math.min(Eu.leg,6):250;Q.caught+=12,nd(),Du.arrive(),e.type===`steeple`?sd(e,t):(t&&rd(t),$.cheerT=1.4,$u(t?`${e.name}  +${t}`:e.name,4600))}if(n.found){let e=n.found;Q.caught+=4,nd(),Du.star(),e.type===`steeple`?sd(e,250):(rd(150),e.type!==`cafe`&&e.type!==`gallery`&&$u(`${e.name} — 发现地标  +150`,3600))}let r=ku.update(e,X);if(t&&r.entered&&(Q.points>0&&sd(r.at,0),Q.banked>0&&Ju()),$.finishT>0&&($.finishT-=e,r.near&&($.finishT=Math.max($.finishT,1.5)),($.finishT<=0||!t)&&Yu()),n.courseOrbs){for(let e=0;e<n.courseOrbs;e++)Q.streak++,Q.mult=Math.min(5,1+Math.floor(Q.streak/6)),rd(25*Q.mult),Du.orb(Q.streak);Q.caught+=n.courseOrbs,Q.streakT=3.4,id(.02*n.courseOrbs),nd()}if(n.course){let e=e=>e===`cafe`?`夜间咖啡馆`:e===`church`?`教堂中殿`:`画廊`;n.course.entered&&n.course.fresh&&!n.arrived?$u(`${e(n.course.entered)} — 室内路线已解锁`,3600):n.course.cleared&&(rd(300),Du.star(),$u(`${e(n.course.cleared)} 路线完成  +300`,4200))}if(Eu.arrivedFor>4.2&&t){Eu.start(X);let e=Eu.target;Y(`guide-label`).textContent=e.name,$u(`下一站：${xd(e)} — 把光球带过去`)}if(X.trick&&Z.theater)X.trick.clean?Du.trick(X.trick.points):Du.bail(),X.trick=null;else if(X.trick){let e=X.trick;e.clean?(rd(e.points),id(e.points/430+.05*e.combo),ad(e.names.join(` + `),`+${(e.points*(X.hyper>0?2:1)).toLocaleString()}`,e.combo>1?`连击`:``),Du.trick(e.points),$.cheerT=1.1):(ad(e.names.length?`${e.names.join(` + `)} — 失误`:`失误`,``,`bail`),Du.bail()),X.trick=null}else if(t&&!X.grounded&&!X.wings&&X.airTime>.3){let e=X.peek();e.length&&ad(e.join(` + `),``,`live`)}$.trickT>0&&($.trickT-=e,$.trickT<=0&&Y(`trick`).classList.remove(`on`)),t&&Q.meter>=1&&X.hyper<=0&&X.grounded&&!X.hall&&!X.walking&&(Q.meter=0,X.hyper=bs,Du.hyper());{let n=Y(`hyper`),r=X.hyper>0;n.classList.toggle(`on`,t&&(r||Q.meter>.03)),n.classList.toggle(`live`,r);let i=`scaleX(${(r?X.hyper/bs:Q.meter).toFixed(3)})`;i!==ed.fill&&(ed.fill=i,Y(`hyper-fill`).style.transform=i),r&&X.grounded&&X.speed>6&&Math.random()<e*34&&Eu.emit(X.wx-X.fx*.75,X.y+.12+Math.random()*.3,X.wz-X.fz*.75,1,.3)}if($.cheerT=Math.max(0,$.cheerT-e),$.grabT=Math.max(0,$.grabT-e),$.look=0,t&&Eu.trail.length&&Eu.arrivedFor<0){let e=Eu.trail[Math.min(Eu.trail.length-1,Eu.progress+1)],t=e.gx-X.gx,n=e.gz-X.gz;if(t*t+n*n<2025){let e=Math.atan2(n,t)-X.heading;$.look=Math.atan2(Math.sin(e),Math.cos(e))}}t&&X.onRoof&&!X.hall&&od(`roof`,`今夜的屋顶也是街道 — 从上面跃下：W/S 空翻 · A/D 转体 · E 耍帅`,6500),t&&$.briefT>0&&($.briefT-=e,($.briefT<=0||$.briefT<6.5&&(Tu.jumpPressed||Tu.throttle>0))&&($.briefT=0,Y(`brief`).classList.remove(`on`))),Q.streakT>0&&(Q.streakT-=e,Q.streakT<=0&&(Q.streak=0,Q.mult=1));let i=Y(`mult`);if(i.classList.toggle(`on`,Q.mult>1),Q.mult>1&&Q.mult!==ed.mult&&(ed.mult=Q.mult,i.textContent=`×${Q.mult}`),Q.shown!==Q.points){let t=Q.points-Q.shown;Q.shown+=t>0?Math.ceil(t*Math.min(1,e*9)):Math.floor(t*Math.min(1,e*5)),Y(`star-count`).textContent=Q.shown.toLocaleString()}Q.bankShown!==Q.banked&&(Q.bankShown+=Math.ceil((Q.banked-Q.bankShown)*Math.min(1,e*5)),Y(`bank-count`).textContent=Q.bankShown.toLocaleString());let a=Y(`guide`);if(a.classList.toggle(`on`,t&&!!Eu.target),t&&Eu.target){Ql.getWorldDirection(hd);let e=Eu.info.bearing-Math.atan2(hd.z,hd.x);e=Math.atan2(Math.sin(e),Math.cos(e)),Y(`guide-arrow`).style.transform=`rotate(${e.toFixed(3)}rad)`;let t=Eu.arrivedFor>=0?`已到达`:`${Math.round(Eu.info.dist)} 米`;t!==ed.dist&&(ed.dist=t,Y(`guide-dist`).textContent=t);let n=Fs[Eu.target.type].color;n!==ed.hl&&(ed.hl=n,a.style.setProperty(`--hl`,n))}if(Au.show(t),t&&(Ql.getWorldDirection(hd),Au.update(e,Z.time,X,Eu,hd.x,hd.z,gu.dots)),Ou.update(Eu.prisms,Z.time),Du.update(X,Z.alive),X.landed&&Du.land(X.landed),X.bump&&Du.bump(X.bump),(X.jumped||X.launched)&&Du.jump(),X.flying&&X.climbing){let e=Math.floor(X.flap/(Math.PI*2));e!==dd&&(dd=e,Du.flapSound())}X.wingsFolded&&Du.fold()}var wd={page:0,riding:0};function Td(){let e=Math.max(wd.page,wd.riding);e&&(Y(`riders`).classList.add(`on`),Y(`riders-count`).textContent=e.toLocaleString(),Y(`riders-label`).textContent=e===1?`位骑手在画中`:`位骑手在画中`)}gu.onCount=e=>{wd.riding=e,Td()};var Ed=Mc(({count:e})=>{wd.page=e,Td()}),Dd=Rl({onAgain:()=>Ku(),onResume:()=>Zu(),onTop:e=>{Y(`riders-best`).textContent=e>0?`最高分 ${e.toLocaleString()}`:``}}),Od={steer:0,throttle:0,brake:1,jump:0,jumpPressed:!1,trick:0,trickPressed:!1},kd={lookYaw:0,lookPitch:.05,zoom:1,on:!1},Ad={x:0,y:0,z:0},jd={lookYaw:0,lookPitch:.1,zoom:1.2},Md=0;function Nd(){if(Y(`hud`).classList.remove(`hidden`),Y(`brief`).classList.add(`on`),$.briefT=11,Y(`hint`).classList.remove(`faded`),Tu.pad&&setTimeout(md,1500),clearTimeout(Md),Md=setTimeout(()=>{Y(`hint`).classList.add(`faded`)},16e3),fo.touch){let e=0;try{e=Number(localStorage.getItem(`nightrider-stick-shown`))||0}catch{}if(e<3){try{localStorage.setItem(`nightrider-stick-shown`,String(e+1))}catch{}let t=Y(`stick-demo`);clearTimeout(Pd),Pd=setTimeout(()=>{Z.state===`ride`&&(t.classList.add(`on`),Pd=setTimeout(()=>t.classList.remove(`on`),7e3))},900)}}}var Pd=0,Fd=new W,Id=new W,Ld=new W,Rd=new W,zd=new W,Bd=new W,Vd=new te;function Hd(e,t,n,r,i,a){let o=1-a,s=o*o*o,c=3*o*o*a,l=3*o*a*a,u=a*a*a;return e.set(t.x*s+n.x*c+r.x*l+i.x*u,t.y*s+n.y*c+r.y*l+i.y*u,t.z*s+n.z*c+r.z*l+i.z*u)}function Ud(e=.016){mu.root.position.set(X.wx,X.y,X.wz),mu.root.rotation.y=-X.worldHeading,mu.pose({wheel:X.wheel,crank:X.crank,steer:X.steer,lean:X.lean,pitch:X.pitch,bob:X.bob,air:X.grounded?0:Math.min(4,X.airTime*3),speed:X.speed,dt:e,wings:X.wings,flying:X.flying,climb:X.climbing,flap:X.flap,sprint:X.sprinting,squash:X.squash,hyper:X.hyperK,spin:X.spin,flip:X.flip,whip:X.whip,trickPose:X.pose,bail:X.bail>0,look:$.look,cheer:$.cheerT>0,grab:$.grabT>0?$.grabSide:0,walk:X.walking,stride:X.stride,park:X.park,flipV:X.flipV,spinV:X.spinV,scramble:X.scramble}),mu.shadow.position.y=X.grounded?.03:-(X.y-X.groundAt(X.gx,X.gz))+.03,mu.setLamp(pu.nearestLamp(X.gx,X.gz,Vd)),Xl.uHeadPos.value.set(X.wx+X.fx*.7,X.y+.85,X.wz+X.fz*.7),Xl.uHeadDir.value.set(X.fx,-.16,X.fz).normalize(),Xl.uHeadPower.value=2.4*Z.alive}function Wd(e){Z.time+=e,Xl.uTime.value=Z.time,Tu.update(Z.time);let t=Nu.gx,n=Nu.gz,r=0;if(Z.state===`title`)Ql.position.copy(ju.pos),Ql.rotation.set(ju.pitch,ju.yaw,0),Fu(Iu(),Z.view.hole.cy),X.update(e,Tu),Ud(e),Eu.update(e,Z.time,X,!1);else if(Z.state===`dive`||Z.state===`rise`){let i=Z.state===`rise`;Z.diveT+=i?-e*Uu:e;let a=Math.max(Z.diveT,0);Z.titleMix=1-Je(0,1.4,a),Z.alive=Je(.1,2.4,a);let o=Je(0,1,(a-Ru)/zu);Z.reveal=Je(.5,4.6,a),r=fe.bend*We(.2,.95,o),X.autoSpeed=i?Wu.speed:a>2.2?fs*.9:0,X.update(e,Tu),Ud(e),Cd(e),wu.update(e,X,Tu);let s=i?Wu.top:ju.pos,c=Rd.set(wu.pos.x,wu.pos.y,wu.pos.z);Bd.set(wu.target.x,wu.target.y,wu.target.z);let l=Fd.subVectors(c,Bd);l.y=0,l.normalize();let u=Ld.copy(c).addScaledVector(l,20);u.y+=8.5;let d=Id.set(s.x+2.6,s.y-2.2,s.z-30);Hd(Ql.position,s,d,u,c,o),zd.copy(s).addScaledVector(Mu,300);let f=zd.lerp(Bd,Je(.05,.92,o));Ql.lookAt(f);let p=Math.log(Iu()),m=Math.log(Lu(wu.fov));Fu(Math.exp(Ve(p,m,o)),Ve(Z.view.hole.cy,Z.view.H/2,o));let h=i&&Wu.far;if(t=h?X.gx:Ve(Nu.gx,X.gx,o),n=h?X.gz:Ve(Nu.gz,X.gz,o),i){let e=Y(`gallery`);Wu.stage===0&&a<1.95*Uu?(e.classList.remove(`gone`),Wu.stage=1):Wu.stage===1&&(e.offsetWidth,e.classList.remove(`leaving`),Wu.stage=2),Z.diveT<=0&&qu()}else a>=8.35&&(Z.state=`ride`,Z.rideT=0,X.auto=!1,Nd())}else if(Z.state===`ride`){Z.rideT+=e,Z.titleMix=0,Z.alive=1,Z.reveal=1,r=fe.bend,Gl.has(`wings`)&&Z.rideT<.05&&!X.wings&&(X.wings=!0,X.vy=9,X.grounded=!1);let i=vu.aside||Su.engaged();if(X.update(e,i?Od:Tu),i&&X.grounded&&(X.speed*=Math.exp(-7*e)),Ud(e),Cd(e),pu.easeHold(e),i&&Su.facing(Ad)){let t=Le(X.worldHeading,Math.atan2(Ad.z-X.wz,Ad.x-X.wx));X.grounded&&Math.abs(t)>.3&&(X.heading+=nt(t-Math.sign(t)*.3,-2.4*e,2.4*e)),$.look=nt(t,-1.1,1.1),kd.lookYaw=G(kd.lookYaw,t*.55,4,e),kd.on=!0}else kd.on?(kd.lookYaw=G(kd.lookYaw,0,3,e),(Math.abs(kd.lookYaw)<.02||Tu.looking)&&(kd.on=!1)):kd.lookYaw=Tu.lookYaw;kd.zoom=Tu.zoom,wu.update(e,X,kd.on?kd:Tu),X.landed>6&&(wu.shake=Math.min(1,X.landed/14)),Ql.position.set(wu.pos.x,wu.pos.y,wu.pos.z),Ql.lookAt(wu.target.x,wu.target.y,wu.target.z),Ql.rotateZ(wu.roll),Fu(Lu(wu.fov),Z.view.H/2),t=X.gx,n=X.gz}else if(Z.state===`done`)Z.doneT+=e,Z.titleMix=0,Z.alive=1,Z.reveal=1,r=fe.bend,X.update(e,Od),Ud(e),Cd(e),jd.lookYaw=.55*Math.sin(Z.doneT*.22),wu.update(e,X,jd),Ql.position.set(wu.pos.x,wu.pos.y,wu.pos.z),Ql.lookAt(wu.target.x,wu.target.y,wu.target.z),Fu(Lu(wu.fov),Z.view.H/2),t=X.gx,n=X.gz;else if(Z.state===`realm`)Z.alive=1,Z.reveal=1,hu.step(e),r=hu.scene?0:fe.bend,t=X.gx,n=X.gz;else if(Z.state===`free`){let e=Z.free;Ql.position.set(e.x,e.y,e.z),Ql.rotation.set(e.pitch*Vt,e.yaw*Vt,0),Fu(Lu(e.fov),Z.view.H/2),r=e.bend,t=e.gx??e.x,n=e.gz??e.z,Ud()}Z.director&&Z.director(e);let i=Z.state===`ride`?X.hyperK:0;tu.composite.uniforms.uRush.value=i*We(7,19,X.speed),tu.composite.uniforms.uBloom.value=.7+.3*i,tu.composite.uniforms.uSaturation.value=1.18+.14*i,$l.material.uniforms.uStarGain.value=Q.skyGain*(1+.5*i),Z.state===`ride`&&!Z.joined&&(Z.joined=Z.rideT>Bu||Math.hypot(X.gx-we.bike.gx,X.gz-we.bike.gz)>Vu),gu.update(e,X,Z.state===`ride`&&Z.joined),Z.state!==`ride`&&vu.open&&vu.show(!1),Su.update(e,X,Z.state===`ride`&&!Z.theater&&!X.flying,vu.open),vu.update(e,window.innerWidth,window.innerHeight),Eu.loose=Z.theater?[]:gu.loose,Xl.uBend.value=r,Xl.uAlive.value=Z.alive,Xl.uHillReveal.value=Z.reveal,eu.setReveal(Z.reveal),tu.composite.uniforms.uTitleMix.value=Z.titleMix,Xl.uSkyLift.value=Math.atan(r*fe.hillRadius-Math.max(0,Ql.position.y-ju.pos.y)/fe.hillRadius),Xl.uBendCenter.value.copy(Ql.position),Xl.uPixel.value=2*Math.tan(Ql.fov*Vt/2)/(tu.height*(Ql.view&&Ql.view.enabled?Ql.view.fullHeight/Ql.view.height:1)),pu.retarget(t,n),pu.work(Z.loading?30:Z.manual?12:fo.touch?3:4.5),pu.cull(Ql),Ql.updateMatrixWorld(),$l.update(Ql);let a=Z.state===`title`&&Z.titleMix>=.999&&!Z.loading;Z.blind||tu.render(Zl,Ql,Z.time,a)}var Gd=performance.now(),Kd={acc:0,n:0,beat:1/30,calm:0,wait:4,tried:!1,relayout:!1};function qd(e){requestAnimationFrame(qd);let t=(e-Gd)/1e3;if(Gd=e,!(t<=0||Z.manual)&&(Kd.relayout&&(Kd.relayout=!1,Pu()),Wd(Math.min(t,.05)),Z.state===`ride`&&!document.hidden&&t<.25&&(Kd.acc+=t,Kd.n++,Kd.n>=90))){let e=Kd.acc/Kd.n;Kd.acc=0,Kd.n=0,Kd.beat=Math.max(1/240,Math.min(Kd.beat,e));let t=e<Math.max(Kd.beat*1.12,.0125);Kd.tried&&!t?(Z.quality=Math.max(.55,Z.quality-.06),Kd.wait=Math.min(Kd.wait*2,64),Kd.calm=0,Kd.tried=!1,Kd.relayout=!0):e>.02&&Z.quality>.55?(Z.quality=Math.max(.55,Z.quality-.12),Kd.calm=0,Kd.tried=!1,Kd.relayout=!0):t&&Z.quality<1&&!Gl.has(`q`)?(Kd.tried=!1,++Kd.calm>=Kd.wait&&(Z.quality=Math.min(1,Z.quality+.06),Kd.calm=0,Kd.tried=!0,Kd.relayout=!0)):(Kd.calm=0,Kd.tried=!1)}}if(Gl.has(`cam`)){let[e,t,n,r,i,a,o]=Gl.get(`cam`).split(`,`).map(Number);Z.state=`free`,Z.free={x:e,y:t,z:n,yaw:r||0,pitch:i||0,fov:a||75,bend:Number.isFinite(o)?o:fe.bend},Z.titleMix=0,Z.alive=1,Z.reveal=1,Y(`gallery`).classList.add(`gone`)}for(Gl.has(`mix`)&&(Z.titleMix=parseFloat(Gl.get(`mix`))),Gl.has(`alive`)&&(Z.alive=parseFloat(Gl.get(`alive`))),Gl.has(`nogallery`)&&Y(`gallery`).classList.add(`gone`),X.auto=!0,X.autoSpeed=0,Wd(.001);pu.pending>0;)pu.work(40),await new Promise(e=>setTimeout(e,0));Wd(.001),Z.loading=!1,Y(`loading`).classList.add(`done`),Gl.has(`ride`)&&(Hu(),Z.diveT=8.34),Gd=performance.now(),requestAnimationFrame(qd);