import type { Domain } from '../types'

/**
 * PMP Examination Content Outline – July 2026 (PMI 공식, 2026-07-09 시행)의 26개 과제.
 * 세부 항목(enabler)은 docs/pipeline/eco-2026-tasks.txt.
 * 문항의 topic 값은 이 과제 이름(ko) 중 하나이고, domain은 과제가 속한 영역을 따른다.
 */
export interface EcoTask {
  code: string
  domain: Domain
  ko: string
  en: string
}

export const ECO_TASKS: EcoTask[] = [
  { code: 'P1', domain: 'people', ko: '공동 비전 수립', en: 'Develop a common vision' },
  { code: 'P2', domain: 'people', ko: '갈등 관리', en: 'Manage conflicts' },
  { code: 'P3', domain: 'people', ko: '프로젝트 팀 리딩', en: 'Lead the project team' },
  { code: 'P4', domain: 'people', ko: '이해관계자 참여', en: 'Engage stakeholders' },
  { code: 'P5', domain: 'people', ko: '이해관계자 기대 정렬', en: 'Align stakeholder expectations' },
  { code: 'P6', domain: 'people', ko: '이해관계자 기대 관리', en: 'Manage stakeholder expectations' },
  { code: 'P7', domain: 'people', ko: '지식 이전', en: 'Help ensure knowledge transfer' },
  { code: 'P8', domain: 'people', ko: '의사소통 계획·관리', en: 'Plan and manage communication' },
  { code: 'R1', domain: 'process', ko: '통합 계획·인도 방식', en: 'Develop an integrated project management plan and plan delivery' },
  { code: 'R2', domain: 'process', ko: '범위 개발·관리', en: 'Develop and manage project scope' },
  { code: 'R3', domain: 'process', ko: '가치 기반 인도', en: 'Help ensure value-based delivery' },
  { code: 'R4', domain: 'process', ko: '자원 계획·관리', en: 'Plan and manage resources' },
  { code: 'R5', domain: 'process', ko: '조달 계획·관리', en: 'Plan and manage procurement' },
  { code: 'R6', domain: 'process', ko: '재무 계획·관리', en: 'Plan and manage finance' },
  { code: 'R7', domain: 'process', ko: '품질 계획·최적화', en: 'Plan and optimize quality of products/deliverables' },
  { code: 'R8', domain: 'process', ko: '일정 계획·관리', en: 'Plan and manage schedule' },
  { code: 'R9', domain: 'process', ko: '프로젝트 상태 평가', en: 'Evaluate project status' },
  { code: 'R10', domain: 'process', ko: '프로젝트 종료', en: 'Manage project closure' },
  { code: 'B1', domain: 'business', ko: '거버넌스 수립', en: 'Define and establish project governance' },
  { code: 'B2', domain: 'business', ko: '규정 준수', en: 'Plan and manage project compliance' },
  { code: 'B3', domain: 'business', ko: '변경 관리·통제', en: 'Manage and control changes' },
  { code: 'B4', domain: 'business', ko: '장애물 제거·이슈 관리', en: 'Remove impediments and manage issues' },
  { code: 'B5', domain: 'business', ko: '리스크 계획·관리', en: 'Plan and manage risk' },
  { code: 'B6', domain: 'business', ko: '지속적 개선', en: 'Continuous improvement' },
  { code: 'B7', domain: 'business', ko: '조직 변화 지원', en: 'Support organizational change' },
  { code: 'B8', domain: 'business', ko: '외부 환경 변화 평가', en: 'Evaluate external business environment changes' },
]

export const TASK_BY_CODE = new Map(ECO_TASKS.map((t) => [t.code, t]))
export const TASK_BY_KO = new Map(ECO_TASKS.map((t) => [t.ko, t]))
