const percent = (part, whole) => whole > 0 && Number.isFinite(part) ? Math.round(100 * part / whole) : null
const degrees = radians => Math.round(radians * 180 / Math.PI)
const average = (a, b) => (a + b) / 2

export function extractFaceMetrics(groups) {
  if (!groups?.length) return null
  const metrics = Object.assign({}, ...groups.map(group => group.metrics))
  return Object.values(metrics).every(value => Number.isFinite(value) && value > 0) ? metrics : null
}

export function medianFaceMetrics(samples) {
  if (!samples.length) return null
  return Object.fromEntries(Object.keys(samples[0]).map(key => {
    const values = samples.map(sample => sample[key]).sort((a, b) => a - b)
    const mid = Math.floor(values.length / 2)
    const median = values.length % 2 ? values[mid] : average(values[mid - 1], values[mid])
    return [key, Math.round(median * 10) / 10]
  }))
}

// Uses ratios in a single image. The eye axis compensates for in-plane tilt.
export function measureFaceDetails(points, aspect, symmetry) {
  if (!Number.isFinite(aspect) || aspect <= 0) return null
  const point = i => {
    const p = points?.[i]
    return Number.isFinite(p?.x) && Number.isFinite(p?.y) ? { x: p.x * aspect, y: p.y } : null
  }
  function midpoint(a, b) {
    const p = point(a), q = point(b)
    return p && q ? { x: average(p.x, q.x), y: average(p.y, q.y) } : null
  }
  const a = midpoint(33, 133), b = midpoint(263, 362)
  const top = point(10), chin = point(152)
  if (!a || !b || !top || !chin) return null
  const axisLength = Math.hypot(b.x - a.x, b.y - a.y)
  if (axisLength < .001) return null
  const ex = (b.x - a.x) / axisLength, ey = (b.y - a.y) / axisLength
  const down = (chin.y - top.y) * ex - (chin.x - top.x) * ey >= 0 ? 1 : -1
  const u = i => { const p = point(i); return p ? p.x * ex + p.y * ey : NaN }
  const v = i => { const p = point(i); return p ? down * (p.y * ex - p.x * ey) : NaN }
  const w = (i, j) => Math.abs(u(i) - u(j))
  const h = (i, j) => Math.abs(v(i) - v(j))
  const angle = (inner, outer) => degrees(Math.atan2(v(inner) - v(outer), w(inner, outer)))
  const width = w(234, 454), height = v(152) - v(10)
  if (!(width > .001 && height > .001)) return null

  const forehead = w(103, 332), jaw = w(172, 397)
  const widthRatio = percent(width, height)
  const foreheadWidthRatio = percent(forehead, width)
  const jawWidthRatio = percent(jaw, width)
  const outline = classifyOutline(height / width, forehead / width, jaw / width)
  const eyeWidth = average(w(33, 133), w(263, 362))
  const eyeGapRatio = percent(w(133, 362), width)
  const browWidth = average(w(70, 107), w(300, 336))
  const browGapRatio = percent(w(107, 336), width)
  const noseWidth = w(98, 327)
  const noseWidthRatio = percent(noseWidth, width)
  const noseLengthRatio = percent(h(168, 2), height)
  const mouthWidth = w(61, 291)
  const mouthWidthRatio = percent(mouthWidth, width)
  const upper = v(9) - v(10), middle = v(2) - v(9), lower = v(152) - v(2)
  const thirds = [upper, middle, lower].every(n => n > 0) ? [
    Math.round(upper / height * 1000) / 10,
    Math.round(middle / height * 1000) / 10,
    Math.round(lower / height * 1000) / 10
  ] : null

  const z = i => points?.[i]?.z * aspect
  const cheekDepth = average(average(z(127), z(356)), average(z(172), z(397))) - average(z(234), z(454))
  const cheekDepthRatio = percent(cheekDepth, width)
  const chinLeft = point(149), chinRight = point(378)
  const chinAngle = chinLeft && chinRight
    ? degrees(Math.atan2(Math.abs((chinLeft.x - chin.x) * (chinRight.y - chin.y) - (chinLeft.y - chin.y) * (chinRight.x - chin.x)),
      (chinLeft.x - chin.x) * (chinRight.x - chin.x) + (chinLeft.y - chin.y) * (chinRight.y - chin.y)))
    : NaN
  const eyeCornerAngle = average(angle(133, 33), angle(362, 263))
  const browAngle = average(angle(107, 70), angle(336, 300))
  const mouthCenterX = average(u(13), u(14)), mouthCenterY = average(v(13), v(14))
  const mouthCornerAngle = i => degrees(Math.atan2(mouthCenterY - v(i), Math.abs(mouthCenterX - u(i))))
  const mouthAngle = average(mouthCornerAngle(61), mouthCornerAngle(291))
  const row = (label, value, unit = '%') => ({ label, value: Number.isFinite(value) ? `${value}${unit}` : '측정할 수 없음' })
  return [
    { title: '얼굴형', interpretation: outlineImpression(outline, widthRatio), rows: [
      { label: '윤곽 유형 추정', value: outline },
      row('높이 대비 너비', widthRatio)
    ] },
    { title: '이마', metrics: { foreheadWidth: foreheadWidthRatio }, interpretation: foreheadImpression(thirds, foreheadWidthRatio), rows: [
      row('얼굴 높이 대비 이마 높이', percent(upper > 0 ? upper : NaN, height)),
      row('얼굴 너비 대비 이마 너비', foreheadWidthRatio)
    ] },
    { title: '눈', metrics: { eyeGap: eyeGapRatio }, interpretation: cornerImpression('눈꼬리', eyeCornerAngle, [
      '눈매 끝이 살짝 내려가 있어 사진에서 부드럽고 편안한 인상으로 보일 수 있어요.',
      '눈매가 수평에 가까워 사진에서 차분해 보일 수 있어요.',
      '눈매 끝이 살짝 올라가 있어 사진에서 또렷한 인상으로 보일 수 있어요.'
    ]), rows: [
      row('평균 눈 길이 / 얼굴 너비', percent(eyeWidth, width)),
      row('평균 눈 뜬 높이 / 눈 길이', percent(average(h(159, 145), h(386, 374)), eyeWidth)),
      row('두 눈 사이 / 얼굴 너비', eyeGapRatio),
      row('눈꼬리 평균 기울기', eyeCornerAngle, '°')
    ] },
    { title: '눈썹', metrics: { browGap: browGapRatio }, interpretation: cornerImpression('눈썹', browAngle, [
      '눈썹 바깥쪽이 내려가 있어 눈 위의 선이 부드럽게 이어져 보일 수 있어요.',
      '눈썹의 양끝 높이가 비슷해 눈 위의 선이 차분하고 고르게 보일 수 있어요.',
      '눈썹 바깥쪽이 올라가 있어 눈 위의 선이 또렷하게 보일 수 있어요.'
    ]), rows: [
      row('평균 눈썹 길이 / 얼굴 너비', percent(browWidth, width)),
      row('평균 눈썹 두께 / 눈썹 길이', percent(average(h(105, 52), h(334, 282)), browWidth)),
      row('두 눈썹 사이 / 얼굴 너비', browGapRatio),
      row('눈썹 평균 기울기', browAngle, '°')
    ] },
    { title: '코', metrics: { noseWidth: noseWidthRatio, noseLength: noseLengthRatio }, interpretation: noseImpression(noseWidthRatio, eyeGapRatio), rows: [
      row('코 길이 / 얼굴 높이', noseLengthRatio),
      row('콧방울 너비 / 얼굴 너비', noseWidthRatio),
      row('콧방울 너비 / 코 길이', percent(noseWidth, h(168, 2)))
    ] },
    { title: '입', metrics: { mouthWidth: mouthWidthRatio }, interpretation: cornerImpression('입꼬리', mouthAngle, [
      '입꼬리가 살짝 내려가 있어 이 사진에서는 진지한 표정처럼 보일 수 있어요.',
      '입꼬리가 수평에 가까워 이 사진에서는 담담한 표정처럼 보일 수 있어요.',
      '입꼬리가 살짝 올라가 있어 이 사진에서는 은은한 미소처럼 보일 수 있어요.'
    ]), rows: [
      row('입 너비 / 얼굴 너비', mouthWidthRatio),
      row('입술 두께 합 / 입 너비', percent(h(0, 13) + h(14, 17), mouthWidth)),
      row('입꼬리 평균 기울기', mouthAngle, '°')
    ] },
    { title: '턱', metrics: { jawWidth: jawWidthRatio }, interpretation: chinImpression(chinAngle, jawWidthRatio), rows: [
      row('아랫입술 아래부터 턱끝 / 얼굴 높이', percent(h(17, 152), height)),
      row('턱 너비 / 얼굴 너비', jawWidthRatio),
      row('턱끝 윤곽 각도', chinAngle, '°')
    ] },
    { title: '광대', metrics: { cheekWidth: widthRatio }, interpretation: cheekImpression(cheekDepthRatio, widthRatio), rows: [
      row('광대 양끝 너비 / 얼굴 높이', widthRatio),
      row('관자·턱 대비 광대의 상대 깊이 추정', cheekDepthRatio)
    ] },
    { title: '전체', metrics: { upperFace: thirds?.[0], midFace: thirds?.[1], lowerFace: thirds?.[2] }, interpretation: overallImpression(thirds, symmetry), rows: [
      { label: '상·중·하 비율', value: thirds ? thirds.map(n => `${n}%`).join(' / ') : '측정할 수 없음' },
      row('좌우 균형 점수', symmetry, '점')
    ] }
  ]
}

function outlineImpression(outline, widthRatio) {
  const impressions = {
    원형: '얼굴 높이와 너비가 가까워서 윤곽이 둥글게 느껴질 수 있어요.',
    타원형: '사진에서 얼굴 윤곽이 세로로 이어지는 인상을 줄 수 있어요.',
    사각형: '턱 쪽 너비가 유지되어 얼굴 아래쪽 윤곽이 선명하게 보일 수 있어요.',
    역삼각형: '이마 쪽이 턱보다 넓어서 윤곽이 아래로 좁아지는 인상을 줄 수 있어요.'
  }
  if (!impressions[outline]) return null
  return {
    measurement: `얼굴 너비는 높이의 ${widthRatio}%이고, 사진 속 윤곽은 ${outline}에 가까워요.`,
    impression: impressions[outline]
  }
}

function foreheadImpression(thirds, widthRatio) {
  if (!thirds || widthRatio == null || widthRatio <= 0) return null
  const [upper, middle] = thirds
  const difference = upper - middle
  return {
    measurement: `이마 너비는 얼굴 너비의 ${widthRatio}%입니다. 모델의 이마 위쪽 특징점을 기준으로 위 구역은 얼굴 높이의 ${upper}%예요.`,
    impression: difference > 4
      ? '이마 쪽 구역이 얼굴 가운데 구역보다 길어서 얼굴 위쪽이 트여 보일 수 있어요.'
      : difference < -4
        ? '이마 쪽 구역이 얼굴 가운데 구역보다 짧아서 눈과 코 쪽이 더 먼저 눈에 들어올 수 있어요.'
        : '위쪽과 가운데 구역의 높이가 비슷해서 눈 위아래의 비율이 고르게 보일 수 있어요.',
    tradition: '전통 관상에서는 이마에 해당하는 위쪽 구역을 상정으로 살폈어요.',
    source: 'aksPhysiognomy'
  }
}

function chinImpression(angle, widthRatio) {
  if (!Number.isFinite(angle) || widthRatio == null || widthRatio <= 0) return null
  return {
    measurement: `턱 너비는 얼굴 너비의 ${widthRatio}%, 턱끝 윤곽 각도는 ${angle}°입니다.`,
    impression: angle < 135
      ? '턱끝으로 윤곽이 모여 아래쪽 선이 또렷하게 보일 수 있어요.'
      : angle > 155
        ? '턱끝 각도가 완만해서 아랫얼굴의 선이 넓게 이어져 보일 수 있어요.'
        : '턱끝이 완만하게 좁아져 얼굴 아래쪽이 부드럽게 마무리되어 보일 수 있어요.'
  }
}

function cheekImpression(depth, widthRatio) {
  return {
    measurement: `광대 양끝 너비는 얼굴 높이의 ${widthRatio}%입니다.`,
    impression: depth == null
      ? '광대 양끝을 잇는 너비는 사진에서 얼굴 가운데의 가로 윤곽을 보여줘요.'
      : depth > 3
        ? '사진에서 광대가 관자·턱보다 앞쪽으로 추정되어 얼굴 가운데 윤곽이 입체적으로 보일 수 있어요.'
        : depth < -3
          ? '사진에서 광대가 관자·턱보다 뒤쪽으로 추정되어 얼굴 가운데 선이 완만하게 이어져 보일 수 있어요.'
          : '사진에서 광대와 주변의 깊이 차이가 작게 추정되어 가운데 윤곽이 고르게 이어져 보일 수 있어요.',
    tradition: '전통 관상의 오악에서는 양쪽 광대를 동악과 서악으로 보았어요.',
    source: 'aksFace'
  }
}

function overallImpression(thirds, symmetry) {
  if (!thirds) return null
  const largest = Math.max(...thirds)
  const section = ['위쪽', '가운데', '아래쪽'][thirds.indexOf(largest)]
  const symmetryNote = Number.isFinite(symmetry) ? ` 좌우 균형은 ${symmetry}점입니다.` : ''
  return {
    measurement: `얼굴 높이의 상·중·하 비율은 ${thirds.join('% / ')}%입니다.${symmetryNote}`,
    impression: largest - Math.min(...thirds) <= 4
      ? '세 구역의 높이가 비슷해 세로 비율이 고르게 보일 수 있어요.'
      : `사진에서 ${section} 구역이 가장 길어 세로 비율에서 그 구역이 두드러져 보일 수 있어요.`
  }
}

function noseImpression(noseWidth, eyeGap) {
  if (noseWidth == null || eyeGap == null || noseWidth <= 0 || eyeGap <= 0) return null
  const difference = noseWidth - eyeGap
  const impression = difference < -2
    ? '콧방울이 눈 사이 간격보다 좁아서 얼굴 한가운데 선이 섬세해 보일 수 있어요.'
    : difference > 2
      ? '콧방울이 눈 사이 간격보다 넓어서 얼굴 한가운데 윤곽이 또렷해 보일 수 있어요.'
      : '콧방울 너비와 눈 사이 간격이 비슷해서 눈과 코의 폭이 균형 있게 보일 수 있어요.'
  return {
    measurement: `얼굴 너비를 기준으로 콧방울은 ${noseWidth}%, 눈 사이 간격은 ${eyeGap}%입니다.`,
    impression,
    tradition: '전통 관상의 오악에서는 코를 얼굴 가운데에 해당하는 중악으로 보았어요.',
    source: 'aksFace'
  }
}

function cornerImpression(feature, angle, impressions) {
  if (!Number.isFinite(angle)) return null
  const direction = angle < -3 ? 0 : angle > 3 ? 2 : 1
  const readings = ['아래쪽', '수평에 가까운 방향', '위쪽']
  return {
    measurement: `${feature} 평균 각도가 ${angle}°로, ${readings[direction]}으로 측정됐어요.`,
    impression: impressions[direction]
  }
}

function classifyOutline(height, forehead, jaw) {
  if (![height, forehead, jaw].every(Number.isFinite)) return '분류할 수 없음'
  if (forehead >= .82 && forehead - jaw >= .19) return '역삼각형'
  if (jaw >= .82 && height < 1.28) return '사각형'
  if (height < 1.12) return '원형'
  return '타원형'
}
