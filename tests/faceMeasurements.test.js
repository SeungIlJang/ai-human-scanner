import test from 'node:test'
import assert from 'node:assert/strict'
import { measureFaceDetails, medianFaceMetrics } from '../src/services/faceMeasurements.js'

const points = []
for (const [index, x, y] of [
  [10, .5, .2], [152, .5, .8], [234, .24, .47], [454, .76, .47],
  [33, .31, .42], [133, .43, .42], [263, .69, .42], [362, .57, .42],
  [103, .28, .28], [332, .72, .28], [172, .34, .68], [397, .66, .68],
  [9, .5, .4], [2, .5, .6], [98, .44, .59], [327, .56, .59],
  [127, .24, .36], [356, .76, .36]
]) points[index] = { x, y, z: [234, 454].includes(index) ? -.05 : 0 }

test('the nine measurement groups include contour, thirds, and relative cheek depth', () => {
  const result = measureFaceDetails(points, 1, 90)
  assert.equal(result.length, 9)
  assert.equal(result[0].rows[0].value, '역삼각형')
  assert.equal(result[7].rows[1].value, '10%')
  assert.equal(result[8].rows[0].value, '33.3% / 33.3% / 33.3%')
  assert.equal(result[8].rows[1].value, '90점')
  assert.equal(result[4].rows[0].value, '측정할 수 없음')
})

test('tilting or mirroring the photo preserves the same measurements', () => {
  const angle = .25
  const tilted = points.map(({ x, y, z }) => ({
    x: .5 - ((x - .5) * Math.cos(angle) - (y - .5) * Math.sin(angle)),
    y: .5 + (x - .5) * Math.sin(angle) + (y - .5) * Math.cos(angle),
    z
  }))
  assert.deepEqual(measureFaceDetails(tilted, 1, 90), measureFaceDetails(points, 1, 90))
  assert.equal(measureFaceDetails([], 1), null)
})

test('the nose explanation changes when its width changes relative to the eye gap', () => {
  const nose = landmarks => measureFaceDetails(landmarks, 1, 90).find(group => group.title === '코').interpretation
  assert.match(nose(points).measurement, /23%.*27%/)
  assert.match(nose(points).impression, /좁아서/)

  const wider = points.slice()
  wider[98] = { ...points[98], x: .39 }
  wider[327] = { ...points[327], x: .61 }
  assert.match(nose(wider).impression, /넓어서/)
  assert.equal(nose(wider).source, 'aksFace')
  delete wider[98]
  assert.equal(nose(wider), null)
})

test('all nine areas have explanations when their landmark data is available', () => {
  const complete = points.slice()
  for (const [index, x, y] of [
    [107, .43, .38], [70, .3, .35], [336, .57, .38], [300, .7, .35],
    [13, .5, .67], [14, .5, .69], [61, .39, .65], [291, .61, .65],
    [149, .42, .75], [378, .58, .75]
  ]) complete[index] = { x, y }
  const groups = measureFaceDetails(complete, 1, 90)
  const explanations = new Map(groups.filter(group => group.interpretation).map(group => [group.title, group.interpretation]))
  assert.deepEqual([...explanations.keys()], ['얼굴형', '이마', '눈', '눈썹', '코', '입', '턱', '광대', '전체'])
  assert.match(explanations.get('이마').impression, /비슷해서/)
  assert.match(explanations.get('턱').impression, /턱끝으로 윤곽이 모여/)
  assert.match(explanations.get('광대').impression, /앞쪽으로 추정/)
  assert.match(explanations.get('전체').measurement, /90점/)

  complete[9] = { ...points[9], y: .46 }
  const differentForehead = measureFaceDetails(complete, 1, 90).find(group => group.title === '이마')
  assert.match(differentForehead.interpretation.impression, /가운데 구역보다 길어서/)
})

test('camera measurements use the central observation rather than a single outlier', () => {
  assert.deepEqual(medianFaceMetrics([
    { noseWidth: 29, eyeGap: 26.2 }, { noseWidth: 30, eyeGap: 26.4 },
    { noseWidth: 55, eyeGap: 34 }, { noseWidth: 31, eyeGap: 26.1 },
    { noseWidth: 30, eyeGap: 26.3 }
  ]), { noseWidth: 30, eyeGap: 26.3 })
})
