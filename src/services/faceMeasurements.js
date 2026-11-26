const percent = (part, whole) => whole > 0 && Number.isFinite(part) ? Math.round(100 * part / whole) : null
const degrees = radians => Math.round(radians * 180 / Math.PI)
const average = (a, b) => (a + b) / 2

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
  const eyeWidth = average(w(33, 133), w(263, 362))
  const browWidth = average(w(70, 107), w(300, 336))
  const noseWidth = w(98, 327)
  const mouthWidth = w(61, 291)
  const upper = v(9) - v(10), middle = v(2) - v(9), lower = v(152) - v(2)
  const thirds = [upper, middle, lower].every(n => n > 0) ? [
    Math.round(upper / height * 1000) / 10,
    Math.round(middle / height * 1000) / 10,
    Math.round(lower / height * 1000) / 10
  ] : null

  const z = i => points?.[i]?.z * aspect
  const cheekDepth = average(average(z(127), z(356)), average(z(172), z(397))) - average(z(234), z(454))
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
    { title: '얼굴형', rows: [
      { label: '윤곽 유형 추정', value: classifyOutline(height / width, forehead / width, jaw / width) },
      row('높이 대비 너비', percent(width, height))
    ] },
    { title: '이마', rows: [
      row('얼굴 높이 대비 이마 높이', percent(upper > 0 ? upper : NaN, height)),
      row('얼굴 너비 대비 이마 너비', percent(forehead, width))
    ] },
    { title: '눈', rows: [
      row('평균 눈 길이 / 얼굴 너비', percent(eyeWidth, width)),
      row('평균 눈 뜬 높이 / 눈 길이', percent(average(h(159, 145), h(386, 374)), eyeWidth)),
      row('두 눈 사이 / 얼굴 너비', percent(w(133, 362), width)),
      row('눈꼬리 평균 기울기', eyeCornerAngle, '°')
    ] },
    { title: '눈썹', rows: [
      row('평균 눈썹 길이 / 얼굴 너비', percent(browWidth, width)),
      row('평균 눈썹 두께 / 눈썹 길이', percent(average(h(105, 52), h(334, 282)), browWidth)),
      row('두 눈썹 사이 / 얼굴 너비', percent(w(107, 336), width)),
      row('눈썹 평균 기울기', browAngle, '°')
    ] },
    { title: '코', rows: [
      row('코 길이 / 얼굴 높이', percent(h(168, 2), height)),
      row('콧방울 너비 / 얼굴 너비', percent(noseWidth, width)),
      row('콧방울 너비 / 코 길이', percent(noseWidth, h(168, 2)))
    ] },
    { title: '입', rows: [
      row('입 너비 / 얼굴 너비', percent(mouthWidth, width)),
      row('입술 두께 합 / 입 너비', percent(h(0, 13) + h(14, 17), mouthWidth)),
      row('입꼬리 평균 기울기', mouthAngle, '°')
    ] },
    { title: '턱', rows: [
      row('아랫입술 아래부터 턱끝 / 얼굴 높이', percent(h(17, 152), height)),
      row('턱 너비 / 얼굴 너비', percent(jaw, width)),
      row('턱끝 윤곽 각도', chinAngle, '°')
    ] },
    { title: '광대', rows: [
      row('광대 양끝 너비 / 얼굴 높이', percent(width, height)),
      row('관자·턱 대비 광대의 상대 깊이 추정', percent(cheekDepth, width))
    ] },
    { title: '전체', rows: [
      { label: '상·중·하 비율', value: thirds ? thirds.map(n => `${n}%`).join(' / ') : '측정할 수 없음' },
      row('좌우 균형 점수', symmetry, '점')
    ] }
  ]
}

function classifyOutline(height, forehead, jaw) {
  if (![height, forehead, jaw].every(Number.isFinite)) return '분류할 수 없음'
  if (forehead >= .82 && forehead - jaw >= .19) return '역삼각형'
  if (jaw >= .82 && height < 1.28) return '사각형'
  if (height < 1.12) return '원형'
  return '타원형'
}
