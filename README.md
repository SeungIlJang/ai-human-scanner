# AI HUMAN SCANNER · AI 인간 분석기

얼굴 특징점을 기기 안에서 시각화하고, 얼굴 생김새와 무관한 시드 난수로 오락용 캐릭터 카드를 만드는 Vue 3 모바일 웹앱입니다. 실제 인성, 성격, 거짓말 횟수는 측정하지 않습니다.

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

- 전면/후면 카메라, 촬영, 갤러리 업로드, 한 명 감지 확인
- MediaPipe Face Landmarker 특징점 478개와 연결선 HUD
- 4초 스캔, 단계 메시지, 완료음, 점수 카운트 애니메이션
- 시드 기반 가상 점수 15종, 가상의 거짓말 횟수·전생 직업·재산, 등급과 해설
- PNG 미리보기·저장 및 Web Share API 이미지 공유 (미지원 브라우저는 다운로드)
- Hash Router, GitHub Pages 자동 배포, 요청 시 로컬 모델/WASM 캐시

점수 항목·범위·가중치는 `src/data/score-config.json`, 해설은 `src/data/descriptions.json`, 직업과 캐릭터 이름은 `src/data/character-types.json`에서 수정합니다. 점수 생성 코드는 `src/services/scoreEngine.js`입니다. 이미지·특징점은 시드 생성에 쓰지 않습니다.

## 경량화와 오프라인 사용

Vue/Vite만 UI에 사용하고 무거운 UI 컴포넌트 라이브러리는 사용하지 않습니다. 얼굴 분석 라이브러리와 결과 화면은 처음부터 내려받지 않고, 필요한 기능을 열 때 로드합니다. PWA 서비스 워커는 홈 화면과 실제로 요청한 파일을 캐시합니다. 따라서 **최초 얼굴 분석을 온라인에서 완료한 뒤** 해당 기기에서 오프라인 분석을 사용할 수 있습니다.

용량을 줄이기 위해 MediaPipe의 SIMD WASM만 배포합니다. WebAssembly SIMD를 지원하지 않는 오래된 브라우저에는 업데이트 안내를 표시합니다. 최신 Android Chrome 및 iPhone Safari를 대상으로 하며, 구형 브라우저 지원이 필요하면 `@mediapipe/tasks-vision/wasm`의 `vision_wasm_nosimd_internal.js`와 `.wasm`을 `public/wasm/`에 추가하고 `src/services/faceDetector.js`의 SIMD 검사 코드를 제거하세요. 이 경우 배포 용량이 약 9.7MB 늘어납니다.

## GitHub Pages 배포

1. 이 폴더를 GitHub 저장소의 **루트**에 올립니다.
2. 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다.
3. `main` 브랜치에 푸시하면 `.github/workflows/deploy.yml`이 테스트, 빌드, 배포를 실행합니다.

Vite `base`는 Actions의 `GITHUB_REPOSITORY`에서 저장소 이름을 읽어 `/<repo>/`로 설정합니다. 로컬에서는 `/`입니다. 사용자/조직 루트 저장소(`*.github.io`)는 `vite.config.js`의 `base`를 `/`로 바꾸세요.

## 개인정보

사진과 얼굴 특징점은 앱의 메모리에서만 처리합니다. LocalStorage와 백엔드를 사용하지 않습니다. 사용자가 PNG 저장 또는 공유를 누를 때만 결과 이미지를 만들고 전달합니다. 홈으로 돌아가거나 다시 분석하면 세션 데이터를 초기화합니다. 촬영 대상자의 동의를 받고 사용하세요.

MediaPipe는 입력 이미지가 기기에서 처리되고 Google로 보내지지 않는다고 설명하지만, **SDK 사용량·성능 지표 전송 가능성**을 별도 [개인정보 안내](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md#privacy-notice)에 명시합니다. 배포 전 해당 안내에 맞는 고지·동의 절차를 검토하세요.

## 오픈소스와 모델

- Vue와 Vite는 MIT 오픈소스입니다. PWA 서비스 워커는 프로젝트 자체 코드입니다.
- `@mediapipe/tasks-vision` 패키지의 `license` 필드는 Apache-2.0입니다. `public/wasm/`은 설치한 동일 버전 패키지의 파일 사본입니다.
- `public/models/face_landmarker.task`는 [Google 공식 모델 URL](https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task)에서 내려받았습니다. SHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.
- [Face Mesh 모델 카드](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf)는 Apache-2.0을 표기합니다. 다만 해당 카드가 이 **정확한 `.task` 번들의 모든 구성요소**의 상업적 재배포 권리를 명시하는지는 별도 확인이 필요합니다. 상업 서비스로 공개하기 전 Google의 해당 번들 라이선스와 고지 요건을 확인하세요.

## 확인한 내용과 한계

`npm test`에서 500개 시드의 재현성·점수 범위·등급·해설 수량을 확인하고 `npm run build`로 PWA 파일을 생성했습니다. Android Chrome, iPhone Safari, 실제 전·후면 카메라, 권한 거부, SNS 앱 공유, 배포된 GitHub Pages는 이 개발 환경에서 실기기 검증이 필요합니다.
