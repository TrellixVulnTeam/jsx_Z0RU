// Copyright 2012 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

"use strict";

// This file relies on the fact that the following declarations have been made
// in runtime.js:
// var $Object = global.Object;

// Keep reference to original values of some global properties.  This
// has the added benefit that the code in this file is isolated from
// changes to these properties.
var $floor = MathFloor;
var $abs = MathAbs;

// Instance class name can only be set on functions. That is the only
// purpose for MathConstructor.
function MathConstructor() {}
var $Math = new MathConstructor();

// -------------------------------------------------------------------

// ECMA 262 - 15.8.2.1
function MathAbs(x) {
  if (%_IsSmi(x)) return x >= 0 ? x : -x;
  x = TO_NUMBER_INLINE(x);
  if (x === 0) return 0;  // To handle -0.
  return x > 0 ? x : -x;
}

// ECMA 262 - 15.8.2.2
function MathAcosJS(x) {
  return %MathAcos(TO_NUMBER_INLINE(x));
}

// ECMA 262 - 15.8.2.3
function MathAsinJS(x) {
  return %MathAsin(TO_NUMBER_INLINE(x));
}

// ECMA 262 - 15.8.2.4
function MathAtanJS(x) {
  return %MathAtan(TO_NUMBER_INLINE(x));
}

// ECMA 262 - 15.8.2.5
// The naming of y and x matches the spec, as does the order in which
// ToNumber (valueOf) is called.
function MathAtan2JS(y, x) {
  return %MathAtan2(TO_NUMBER_INLINE(y), TO_NUMBER_INLINE(x));
}

// ECMA 262 - 15.8.2.6
function MathCeil(x) {
  return -MathFloor(-x);
}

// ECMA 262 - 15.8.2.7
function MathCos(x) {
  x = MathAbs(x);  // Convert to number and get rid of -0.
  return TrigonometricInterpolation(x, 1);
}

// ECMA 262 - 15.8.2.8
function MathExp(x) {
  return %MathExpRT(TO_NUMBER_INLINE(x));
}

// ECMA 262 - 15.8.2.9
function MathFloor(x) {
  x = TO_NUMBER_INLINE(x);
  // It's more common to call this with a positive number that's out
  // of range than negative numbers; check the upper bound first.
  if (x < 0x80000000 && x > 0) {
    // Numbers in the range [0, 2^31) can be floored by converting
    // them to an unsigned 32-bit value using the shift operator.
    // We avoid doing so for -0, because the result of Math.floor(-0)
    // has to be -0, which wouldn't be the case with the shift.
    return TO_UINT32(x);
  } else {
    return %MathFloorRT(x);
  }
}

// ECMA 262 - 15.8.2.10
function MathLog(x) {
  return %_MathLogRT(TO_NUMBER_INLINE(x));
}

// ECMA 262 - 15.8.2.11
function MathMax(arg1, arg2) {  // length == 2
  var length = %_ArgumentsLength();
  if (length == 2) {
    arg1 = TO_NUMBER_INLINE(arg1);
    arg2 = TO_NUMBER_INLINE(arg2);
    if (arg2 > arg1) return arg2;
    if (arg1 > arg2) return arg1;
    if (arg1 == arg2) {
      // Make sure -0 is considered less than +0.
      return (arg1 === 0 && %_IsMinusZero(arg1)) ? arg2 : arg1;
    }
    // All comparisons failed, one of the arguments must be NaN.
    return NAN;
  }
  var r = -INFINITY;
  for (var i = 0; i < length; i++) {
    var n = %_Arguments(i);
    if (!IS_NUMBER(n)) n = NonNumberToNumber(n);
    // Make sure +0 is considered greater than -0.
    if (NUMBER_IS_NAN(n) || n > r || (r === 0 && n === 0 && %_IsMinusZero(r))) {
      r = n;
    }
  }
  return r;
}

// ECMA 262 - 15.8.2.12
function MathMin(arg1, arg2) {  // length == 2
  var length = %_ArgumentsLength();
  if (length == 2) {
    arg1 = TO_NUMBER_INLINE(arg1);
    arg2 = TO_NUMBER_INLINE(arg2);
    if (arg2 > arg1) return arg1;
    if (arg1 > arg2) return arg2;
    if (arg1 == arg2) {
      // Make sure -0 is considered less than +0.
      return (arg1 === 0 && %_IsMinusZero(arg1)) ? arg1 : arg2;
    }
    // All comparisons failed, one of the arguments must be NaN.
    return NAN;
  }
  var r = INFINITY;
  for (var i = 0; i < length; i++) {
    var n = %_Arguments(i);
    if (!IS_NUMBER(n)) n = NonNumberToNumber(n);
    // Make sure -0 is considered less than +0.
    if (NUMBER_IS_NAN(n) || n < r || (r === 0 && n === 0 && %_IsMinusZero(n))) {
      r = n;
    }
  }
  return r;
}

// ECMA 262 - 15.8.2.13
function MathPow(x, y) {
  return %_MathPow(TO_NUMBER_INLINE(x), TO_NUMBER_INLINE(y));
}

// ECMA 262 - 15.8.2.14
var rngstate;  // Initialized to a Uint32Array during genesis.
function MathRandom() {
  var r0 = (MathImul(18273, rngstate[0] & 0xFFFF) + (rngstate[0] >>> 16)) | 0;
  rngstate[0] = r0;
  var r1 = (MathImul(36969, rngstate[1] & 0xFFFF) + (rngstate[1] >>> 16)) | 0;
  rngstate[1] = r1;
  var x = ((r0 << 16) + (r1 & 0xFFFF)) | 0;
  // Division by 0x100000000 through multiplication by reciprocal.
  return (x < 0 ? (x + 0x100000000) : x) * 2.3283064365386962890625e-10;
}

// ECMA 262 - 15.8.2.15
function MathRound(x) {
  return %RoundNumber(TO_NUMBER_INLINE(x));
}

// ECMA 262 - 15.8.2.16
function MathSin(x) {
  x = x * 1;  // Convert to number and deal with -0.
  if (%_IsMinusZero(x)) return x;
  return TrigonometricInterpolation(x, 0);
}

// ECMA 262 - 15.8.2.17
function MathSqrt(x) {
  return %_MathSqrtRT(TO_NUMBER_INLINE(x));
}

// ECMA 262 - 15.8.2.18
function MathTan(x) {
  return MathSin(x) / MathCos(x);
}

// Non-standard extension.
function MathImul(x, y) {
  return %NumberImul(TO_NUMBER_INLINE(x), TO_NUMBER_INLINE(y));
}


var kInversePiHalf      = 0.636619772367581343;      // 2 / pi
var kInversePiHalfS26   = 9.48637384723993156e-9;    // 2 / pi / (2^26)
var kS26                = 1 << 26;
var kTwoStepThreshold   = 1 << 27;
// pi / 2 rounded up
var kPiHalf             = 1.570796326794896780;      // 0x192d4454fb21f93f
// We use two parts for pi/2 to emulate a higher precision.
// pi_half_1 only has 26 significant bits for mantissa.
// Note that pi_half > pi_half_1 + pi_half_2
var kPiHalf1            = 1.570796325802803040;      // 0x00000054fb21f93f
var kPiHalf2            = 9.920935796805404252e-10;  // 0x3326a611460b113e

var kSamples;            // Initialized to a number during genesis.
var kIndexConvert;       // Initialized to kSamples / (pi/2) during genesis.
var kSinTable;           // Initialized to a Float64Array during genesis.
var kCosXIntervalTable;  // Initialized to a Float64Array during genesis.

// This implements sine using the following algorithm.
// 1) Multiplication takes care of to-number conversion.
// 2) Reduce x to the first quadrant [0, pi/2].
//    Conveniently enough, in case of +/-Infinity, we get NaN.
//    Note that we try to use only 26 instead of 52 significant bits for
//    mantissa to avoid rounding errors when multiplying.  For very large
//    input we therefore have additional steps.
// 3) Replace x by (pi/2-x) if x was in the 2nd or 4th quadrant.
// 4) Do a table lookup for the closest samples to the left and right of x.
// 5) Find the derivatives at those sampling points by table lookup:
//    dsin(x)/dx = cos(x) = sin(pi/2-x) for x in [0, pi/2].
// 6) Use cubic spline interpolation to approximate sin(x).
// 7) Negate the result if x was in the 3rd or 4th quadrant.
// 8) Get rid of -0 by adding 0.
function TrigonometricInterpolation(x, phase) {
  if (x < 0 || x > kPiHalf) {
    var multiple;
    while (x < -kTwoStepThreshold || x > kTwoStepThreshold) {
      // Let's assume this loop does not terminate.
      // All numbers x in each loop forms a set S.
      // (1) abs(x) > 2^27 for all x in S.
      // (2) abs(multiple) != 0 since (2^27 * inverse_pi_half_s26) > 1
      // (3) multiple is rounded down in 2^26 steps, so the rounding error is
      //     at most max(ulp, 2^26).
      // (4) so for x > 2^27, we subtract at most (1+pi/4)x and at least
      //     (1-pi/4)x
      // (5) The subtraction results in x' so that abs(x') <= abs(x)*pi/4.
      //     Note that this difference cannot be simply rounded off.
      // Set S cannot exist since (5) violates (1).  Loop must terminate.
      multiple = MathFloor(x * kInversePiHalfS26) * kS26;
      x = x - multiple * kPiHalf1 - multiple * kPiHalf2;
    }
    multiple = MathFloor(x * kInversePiHalf);
    x = x - multiple * kPiHalf1 - multiple * kPiHalf2;
    phase += multiple;
  }
  var double_index = x * kIndexConvert;
  if (phase & 1) double_index = kSamples - double_index;
  var index = double_index | 0;
  var t1 = double_index - index;
  var t2 = 1 - t1;
  var y1 = kSinTable[index];
  var y2 = kSinTable[index + 1];
  var dy = y2 - y1;
  return (t2 * y1 + t1 * y2 +
              t1 * t2 * ((kCosXIntervalTable[index] - dy) * t2 +
                         (dy - kCosXIntervalTable[index + 1]) * t1))
         * (1 - (phase & 2)) + 0;
}


// ES6 draft 09-27-13, section 20.2.2.28.
function MathSign(x) {
  x = TO_NUMBER_INLINE(x);
  if (x > 0) return 1;
  if (x < 0) return -1;
  if (x === 0) return x;
  return NAN;
}


// ES6 draft 09-27-13, section 20.2.2.34.
function MathTrunc(x) {
  x = TO_NUMBER_INLINE(x);
  if (x > 0) return MathFloor(x);
  if (x < 0) return MathCeil(x);
  if (x === 0) return x;
  return NAN;
}


// ES6 draft 09-27-13, section 20.2.2.30.
function MathSinh(x) {
  if (!IS_NUMBER(x)) x = NonNumberToNumber(x);
  // Idempotent for NaN, +/-0 and +/-Infinity.
  if (x === 0 || !NUMBER_IS_FINITE(x)) return x;
  return (MathExp(x) - MathExp(-x)) / 2;
}


// ES6 draft 09-27-13, section 20.2.2.12.
function MathCosh(x) {
  if (!IS_NUMBER(x)) x = NonNumberToNumber(x);
  if (!NUMBER_IS_FINITE(x)) return MathAbs(x);
  return (MathExp(x) + MathExp(-x)) / 2;
}


// ES6 draft 09-27-13, section 20.2.2.33.
function MathTanh(x) {
  if (!IS_NUMBER(x)) x = NonNumberToNumber(x);
  // Idempotent for +/-0.
  if (x === 0) return x;
  // Returns +/-1 for +/-Infinity.
  if (!NUMBER_IS_FINITE(x)) return MathSign(x);
  var exp1 = MathExp(x);
  var exp2 = MathExp(-x);
  return (exp1 - exp2) / (exp1 + exp2);
}


// ES6 draft 09-27-13, section 20.2.2.5.
function MathAsinh(x) {
  if (!IS_NUMBER(x)) x = NonNumberToNumber(x);
  // Idempotent for NaN, +/-0 and +/-Infinity.
  if (x === 0 || !NUMBER_IS_FINITE(x)) return x;
  if (x > 0) return MathLog(x + MathSqrt(x * x + 1));
  // This is to prevent numerical errors caused by large negative x.
  return -MathLog(-x + MathSqrt(x * x + 1));
}


// ES6 draft 09-27-13, section 20.2.2.3.
function MathAcosh(x) {
  if (!IS_NUMBER(x)) x = NonNumberToNumber(x);
  if (x < 1) return NAN;
  // Idempotent for NaN and +Infinity.
  if (!NUMBER_IS_FINITE(x)) return x;
  return MathLog(x + MathSqrt(x + 1) * MathSqrt(x - 1));
}


// ES6 draft 09-27-13, section 20.2.2.7.
function MathAtanh(x) {
  if (!IS_NUMBER(x)) x = NonNumberToNumber(x);
  // Idempotent for +/-0.
  if (x === 0) return x;
  // Returns NaN for NaN and +/- Infinity.
  if (!NUMBER_IS_FINITE(x)) return NAN;
  return 0.5 * MathLog((1 + x) / (1 - x));
}


// ES6 draft 09-27-13, section 20.2.2.21.
function MathLog10(x) {
  return MathLog(x) * 0.434294481903251828;  // log10(x) = log(x)/log(10).
}


// ES6 draft 09-27-13, section 20.2.2.22.
function MathLog2(x) {
  return MathLog(x) * 1.442695040888963407;  // log2(x) = log(x)/log(2).
}


// ES6 draft 09-27-13, section 20.2.2.17.
function MathHypot(x, y) {  // Function length is 2.
  // We may want to introduce fast paths for two arguments and when
  // normalization to avoid overflow is not necessary.  For now, we
  // simply assume the general case.
  var length = %_ArgumentsLength();
  var args = new InternalArray(length);
  var max = 0;
  for (var i = 0; i < length; i++) {
    var n = %_Arguments(i);
    if (!IS_NUMBER(n)) n = NonNumberToNumber(n);
    if (n === INFINITY || n === -INFINITY) return INFINITY;
    n = MathAbs(n);
    if (n > max) max = n;
    args[i] = n;
  }

  // Kahan summation to avoid rounding errors.
  // Normalize the numbers to the largest one to avoid overflow.
  if (max === 0) max = 1;
  var sum = 0;
  var compensation = 0;
  for (var i = 0; i < length; i++) {
    var n = args[i] / max;
    var summand = n * n - compensation;
    var preliminary = sum + summand;
    compensation = (preliminary - sum) - summand;
    sum = preliminary;
  }
  return MathSqrt(sum) * max;
}


// ES6 draft 09-27-13, section 20.2.2.16.
function MathFroundJS(x) {
  return %MathFround(TO_NUMBER_INLINE(x));
}


function MathClz32(x) {
  x = ToUint32(TO_NUMBER_INLINE(x));
  if (x == 0) return 32;
  var result = 0;
  // Binary search.
  if ((x & 0xFFFF0000) === 0) { x <<= 16; result += 16; };
  if ((x & 0xFF000000) === 0) { x <<=  8; result +=  8; };
  if ((x & 0xF0000000) === 0) { x <<=  4; result +=  4; };
  if ((x & 0xC0000000) === 0) { x <<=  2; result +=  2; };
  if ((x & 0x80000000) === 0) { x <<=  1; result +=  1; };
  return result;
}


// ES6 draft 09-27-13, section 20.2.2.9.
// Cube root approximation, refer to: http://metamerist.com/cbrt/cbrt.htm
// Using initial approximation adapted from Kahan's cbrt and 4 iterations
// of Newton's method.
function MathCbrt(x) {
  if (!IS_NUMBER(x)) x = NonNumberToNumber(x);
  if (x == 0 || !NUMBER_IS_FINITE(x)) return x;
  return x >= 0 ? CubeRoot(x) : -CubeRoot(-x);
}

macro NEWTON_ITERATION_CBRT(x, approx)
  (1.0 / 3.0) * (x / (approx * approx) + 2 * approx);
endmacro

function CubeRoot(x) {
  var approx_hi = MathFloor(%_DoubleHi(x) / 3) + 0x2A9F7893;
  var approx = %_ConstructDouble(approx_hi, 0);
  approx = NEWTON_ITERATION_CBRT(x, approx);
  approx = NEWTON_ITERATION_CBRT(x, approx);
  approx = NEWTON_ITERATION_CBRT(x, approx);
  return NEWTON_ITERATION_CBRT(x, approx);
}



// ES6 draft 09-27-13, section 20.2.2.14.
// Use Taylor series to approximate.
// exp(x) - 1 at 0 == -1 + exp(0) + exp'(0)*x/1! + exp''(0)*x^2/2! + ...
//                 == x/1! + x^2/2! + x^3/3! + ...
// The closer x is to 0, the fewer terms are required.
function MathExpm1(x) {
  if (!IS_NUMBER(x)) x = NonNumberToNumber(x);
  var xabs = MathAbs(x);
  if (xabs < 2E-7) {
    return x * (1 + x * (1/2));
  } else if (xabs < 6E-5) {
    return x * (1 + x * (1/2 + x * (1/6)));
  } else if (xabs < 2E-2) {
    return x * (1 + x * (1/2 + x * (1/6 +
           x * (1/24 + x * (1/120 + x * (1/720))))));
  } else {  // Use regular exp if not close enough to 0.
    return MathExp(x) - 1;
  }
}


// ES6 draft 09-27-13, section 20.2.2.20.
// Use Taylor series to approximate. With y = x + 1;
// log(y) at 1 == log(1) + log'(1)(y-1)/1! + log''(1)(y-1)^2/2! + ...
//             == 0 + x - x^2/2 + x^3/3 ...
// The closer x is to 0, the fewer terms are required.
function MathLog1p(x) {
  if (!IS_NUMBER(x)) x = NonNumberToNumber(x);
  var xabs = MathAbs(x);
  if (xabs < 1E-7) {
    return x * (1 - x * (1/2));
  } else if (xabs < 3E-5) {
    return x * (1 - x * (1/2 - x * (1/3)));
  } else if (xabs < 7E-3) {
    return x * (1 - x * (1/2 - x * (1/3 - x * (1/4 -
           x * (1/5 - x * (1/6 - x * (1/7)))))));
  } else {  // Use regular log if not close enough to 0.
    return MathLog(1 + x);
  }
}

// -------------------------------------------------------------------

function SetUpMath() {
  %CheckIsBootstrapping();

  %SetPrototype($Math, $Object.prototype);
  %AddNamedProperty(global, "Math", $Math, DONT_ENUM);
  %FunctionSetInstanceClassName(MathConstructor, 'Math');

  // Set up math constants.
  InstallConstants($Math, $Array(
    // ECMA-262, section 15.8.1.1.
    "E", 2.7182818284590452354,
    // ECMA-262, section 15.8.1.2.
    "LN10", 2.302585092994046,
    // ECMA-262, section 15.8.1.3.
    "LN2", 0.6931471805599453,
    // ECMA-262, section 15.8.1.4.
    "LOG2E", 1.4426950408889634,
    "LOG10E", 0.4342944819032518,
    "PI", 3.1415926535897932,
    "SQRT1_2", 0.7071067811865476,
    "SQRT2", 1.4142135623730951
  ));

  // Set up non-enumerable functions of the Math object and
  // set their names.
  InstallFunctions($Math, DONT_ENUM, $Array(
    "random", MathRandom,
    "abs", MathAbs,
    "acos", MathAcosJS,
    "asin", MathAsinJS,
    "atan", MathAtanJS,
    "ceil", MathCeil,
    "cos", MathCos,
    "exp", MathExp,
    "floor", MathFloor,
    "log", MathLog,
    "round", MathRound,
    "sin", MathSin,
    "sqrt", MathSqrt,
    "tan", MathTan,
    "atan2", MathAtan2JS,
    "pow", MathPow,
    "max", MathMax,
    "min", MathMin,
    "imul", MathImul,
    "sign", MathSign,
    "trunc", MathTrunc,
    "sinh", MathSinh,
    "cosh", MathCosh,
    "tanh", MathTanh,
    "asinh", MathAsinh,
    "acosh", MathAcosh,
    "atanh", MathAtanh,
    "log10", MathLog10,
    "log2", MathLog2,
    "hypot", MathHypot,
    "fround", MathFroundJS,
    "clz32", MathClz32,
    "cbrt", MathCbrt,
    "log1p", MathLog1p,
    "expm1", MathExpm1
  ));

  %SetInlineBuiltinFlag(MathCeil);
  %SetInlineBuiltinFlag(MathRandom);
  %SetInlineBuiltinFlag(MathSin);
  %SetInlineBuiltinFlag(MathCos);
  %SetInlineBuiltinFlag(MathTan);
  %SetInlineBuiltinFlag(TrigonometricInterpolation);
}

SetUpMath();
