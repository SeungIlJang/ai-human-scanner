# AI HUMAN SCANNER · AI 인간 분석기

얼굴 특징점을 기기 안에서 시각화하고, 얼굴 비율과 좌우 균형을 측정해 재미용 관상 점수를 보여주는 Vue 3 모바일 웹앱입니다. 실제 인성, 성격, 거짓말 횟수는 측정하지 않습니다.

## 실행

Node.js 20.16 이상과 npm이 필요합니다.

```bash
npm ci
npm run dev
```

브라우저에서 표시된 주소를 엽니다. 카메라는 `localhost` 또는 HTTPS에서만 동작합니다. 휴대폰에서 로컬 서버를 테스트할 때는 HTTPS 터널이나 HTTPS 개발 서버를 사용하세요.

```bash
npm test
npm run build
npm run preview
```

## 기능

- 전면/후면 카메라, 안정적인 얼굴 인식 후 자동 촬영, 수동 촬영, 갤러리 업로드
- 카메라에서는 1명 추적 모드의 MediaPipe 시간축 보정을 사용하고, 촬영 사진은 정지 이미지 모드에서 다시 분석해 여러 얼굴을 확인
- MediaPipe Face Landmarker 특징점 478개와 연결선 HUD
- 사진 속 눈 너비, 볼 간격, 입꼬리 간격의 좌우 균형을 평균한 관상 스캔 점수와 얼굴 비율 표시
- 4초 스캔, 단계 메시지, 완료음, 점수 카운트 애니메이션
- 인성 점수, 거짓말 횟수, 못된 짓 횟수, 잔머리 지수, 전생 직업, 동물 유형을 얼굴 스캔 아래 표시하고 다른 점수는 하단에서 펼쳐 보기
- Hash Router, GitHub Pages 자동 배포, 요청 시 로컬 모델/WASM 캐시

점수 범위는 `src/data/score-config.json`에서 관리합니다. `src/services/physiognomyScore.js`는 `src/data/physiognomy-sources.json`에 기록한 전통 관상 분류의 적용 대상과 사진의 측정값을 결합해 재미용 점수를 생성합니다. 전통 분류는 부위 선택에 쓰이며 점수 생성 규칙은 앱에서 정합니다.

## 경량화와 오프라인 사용

Vue/Vite만 UI에 사용하고 무거운 UI 컴포넌트 라이브러리는 사용하지 않습니다. 얼굴 분석 라이브러리와 결과 화면은 처음부터 내려받지 않고, 필요한 기능을 열 때 로드합니다. PWA 서비스 워커는 홈 화면과 실제로 요청한 파일을 캐시합니다. 따라서 **최초 얼굴 분석을 온라인에서 완료한 뒤** 해당 기기에서 오프라인 분석을 사용할 수 있습니다.

용량을 줄이기 위해 MediaPipe의 SIMD WASM만 배포합니다. WebAssembly SIMD를 지원하지 않는 오래된 브라우저에는 업데이트 안내를 표시합니다. 최신 Android Chrome 및 iPhone Safari를 대상으로 하며, 구형 브라우저 지원이 필요하면 `@mediapipe/tasks-vision/wasm`의 `vision_wasm_nosimd_internal.js`와 `.wasm`을 `public/wasm/`에 추가하고 `src/services/faceDetector.js`의 SIMD 검사 코드를 제거하세요. 이 경우 배포 용량이 약 9.7MB 늘어납니다.

## GitHub Pages 배포

1. 이 폴더를 GitHub 저장소의 **루트**에 올립니다.
2. 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다.
3. `main` 브랜치에 푸시하면 `.github/workflows/deploy.yml`이 테스트, 빌드, 배포를 실행합니다.

Vite `base`는 Actions의 `GITHUB_REPOSITORY`에서 저장소 이름을 읽어 `/<repo>/`로 설정합니다. 로컬에서는 `/`입니다. 사용자/조직 루트 저장소(`*.github.io`)는 `vite.config.js`의 `base`를 `/`로 바꾸세요.

## 개인정보

사진과 얼굴 특징점은 앱의 메모리에서만 처리합니다. LocalStorage와 백엔드를 사용하지 않습니다. 홈으로 돌아가거나 다시 분석하면 세션 데이터를 초기화합니다. 촬영 대상자의 동의를 받고 사용하세요.

MediaPipe는 입력 이미지가 기기에서 처리되고 Google로 보내지지 않는다고 설명하지만, **SDK 사용량·성능 지표 전송 가능성**을 별도 [개인정보 안내](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md#privacy-notice)에 명시합니다. 배포 전 해당 안내에 맞는 고지·동의 절차를 검토하세요.

## 오픈소스와 모델

- Vue와 Vite는 MIT 오픈소스입니다. PWA 서비스 워커는 프로젝트 자체 코드입니다.
- `@mediapipe/tasks-vision` 패키지의 `license` 필드는 Apache-2.0입니다. `public/wasm/`은 설치한 동일 버전 패키지의 파일 사본입니다.
- `public/models/face_landmarker.task`는 [Google 공식 모델 URL](https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task)에서 내려받았습니다. SHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.
- [Face Mesh 모델 카드](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf)는 Apache-2.0을 표기합니다. 다만 해당 카드가 이 **정확한 `.task` 번들의 모든 구성요소**의 상업적 재배포 권리를 명시하는지는 별도 확인이 필요합니다. 상업 서비스로 공개하기 전 Google의 해당 번들 라이선스와 고지 요건을 확인하세요.

## 확인한 내용과 한계

`npm test`에서 500개 시드의 재현성·점수 범위·등급·해설 수량을 확인하고 `npm run build`로 PWA 파일을 생성했습니다. Android Chrome, iPhone Safari, 실제 전·후면 카메라, 권한 거부, 배포된 GitHub Pages는 이 개발 환경에서 실기기 검증이 필요합니다.
