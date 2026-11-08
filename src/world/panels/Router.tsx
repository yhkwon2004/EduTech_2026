import type { RefObject } from 'react'
import type { DayDecision, DayResult } from '@/game/types'
import type { BuildingId, HitId } from '../map'
import type { WorldHandle } from '../render/World'
import { AcademyPanel } from './AcademyPanel'
import { BoardPanel, type BoardTab } from './BoardPanel'
import { CompanyPanel } from './CompanyPanel'
import { FarmPanel } from './FarmPanel'
import { MarketPanel } from './MarketPanel'
import { BagPanel, RivalPanel, SettingsPanel } from './MiscPanels'
import { ResultPanel } from './ResultPanel'
import { ShopPanel } from './ShopPanel'
import { SupportPanel } from './SupportPanel'
import { WorkshopPanel } from './WorkshopPanel'
import { CharacterPanel } from './CharacterPanel'
import { TreePanel } from './TreePanel'
import { NpcQuizPanel } from './NpcQuizPanel'
import { BuildPanel } from './BuildPanel'
import { FactoryPanel } from './FactoryPanel'

export type MenuId = 'bag' | 'quest' | 'rank' | 'settings' | 'character' | 'build'
export interface PanelState {
  hit: HitId | MenuId | 'result'
  /** 패널 안에서 바로 열 화면 (예: 레슨 id, 게시판 탭) */
  sub?: string
  result?: DayResult
}

export function PanelRouter({
  panel,
  onClose,
  open,
  world,
  onRunDay,
  goTarget,
}: {
  panel: PanelState
  onClose: () => void
  open: (p: PanelState) => void
  world: RefObject<WorldHandle | null>
  onRunDay: (d: DayDecision) => void
  goTarget: (t: BuildingId | 'farm') => void
}) {
  const walk = (hit: HitId) => {
    onClose()
    world.current?.walkTo(hit)
  }
  const openLesson = (id: string) => open({ hit: 'academy', sub: id || undefined })
  const { hit } = panel

  if (hit.startsWith('plot:')) return <FarmPanel plotId={hit.slice(5)} onClose={onClose} goMarket={() => walk('market')} />
  if (hit.startsWith('rival:')) return <RivalPanel index={Number(hit.slice(6))} onClose={onClose} />
  if (hit.startsWith('npc:')) return <NpcQuizPanel villager={Number(hit.slice(4))} onClose={onClose} openLesson={openLesson} />

  switch (hit) {
    case 'shop':
      return <ShopPanel onClose={onClose} onRun={onRunDay} goWorkshop={() => walk('workshop')} openLesson={openLesson} goCompany={() => walk('company')} />
    case 'workshop':
      return <WorkshopPanel onClose={onClose} goMarket={() => walk('market')} goShop={() => walk('shop')} />
    case 'market':
      return <MarketPanel onClose={onClose} />
    case 'academy':
      return <AcademyPanel key={panel.sub ?? 'academy'} onClose={onClose} lessonId={panel.sub} />
    case 'company':
      return <CompanyPanel onClose={onClose} openLesson={openLesson} onStartup={() => walk('shop')} />
    case 'support':
      return <SupportPanel onClose={onClose} openLesson={openLesson} />
    case 'board':
    case 'quest':
    case 'rank':
      return (
        <BoardPanel
          onClose={onClose}
          initial={(panel.sub as BoardTab | undefined) ?? (hit === 'rank' ? 'rank' : 'quest')}
          onGo={(t) => {
            onClose()
            goTarget(t)
          }}
        />
      )
    case 'factory':
      return <FactoryPanel onClose={onClose} goMarket={() => walk('market')} />
    case 'build':
      return <BuildPanel id={panel.sub as BuildingId} onClose={onClose} openLesson={openLesson} onBuilt={() => walk(panel.sub as BuildingId)} />
    case 'tree':
      return <TreePanel onClose={onClose} goAcademy={() => walk('academy')} openLesson={openLesson} />
    case 'bag':
      return <BagPanel onClose={onClose} />
    case 'settings':
      return <SettingsPanel onClose={onClose} onCharacter={() => open({ hit: 'character' })} />
    case 'character':
      return <CharacterPanel onClose={onClose} />
    case 'result':
      return panel.result ? <ResultPanel result={panel.result} onClose={onClose} openLesson={openLesson} /> : null
    default:
      return null
  }
}
