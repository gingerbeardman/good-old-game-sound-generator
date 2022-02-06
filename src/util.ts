import { playInterval, quantize } from "./audio";

export function times(n: number, func: Function) {
  let result = [];
  for (let i = 0; i < n; i++) {
    result.push(func(i));
  }
  return result;
}

export function getQuantizedTime(time: number) {
  const interval = playInterval * quantize;
  return interval > 0 ? Math.ceil(time / interval) * interval : time;
}

export function pitchToFreq(pitch) {
  return 440 * Math.pow(2, (pitch - 69) / 12);
}

export function stableSort(values: any[], compareFunc?: Function) {
  if (compareFunc == null) {
    compareFunc = (a, b) => a - b;
  }
  const indexedValues = values.map((v, i) => [v, i]);
  indexedValues.sort((a, b) => {
    const cmp = compareFunc(a[0], b[0]);
    return cmp !== 0 ? cmp : a[1] - b[1];
  });
  return indexedValues.map((v) => v[0]);
}

export function cloneDeep(o) {
  return { ...o };
}
