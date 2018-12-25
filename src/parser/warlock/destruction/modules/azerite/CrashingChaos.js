import React from 'react';

import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events from 'parser/core/Events';

import SPELLS from 'common/SPELLS';
import { formatThousands } from 'common/format';
import SpellLink from 'common/SpellLink';

import TraitStatisticBox from 'interface/others/TraitStatisticBox';
import ItemDamageDone from 'interface/others/ItemDamageDone';

import CrashingChaosChaoticInfernoCore from './CrashingChaosChaoticInfernoCore';

const STACKS_PER_PROC = 8;

class CrashingChaos extends Analyzer {
  static dependencies = {
    core: CrashingChaosChaoticInfernoCore,
  };

  _buffedChaosBolts = 0;
  _buffCount = 0;

  constructor(...args) {
    super(...args);
    this.active = this.selectedCombatant.hasTrait(SPELLS.CRASHING_CHAOS.id);

    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.CHAOS_BOLT), this.onChaosBoltCast);
    this.addEventListener(Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.CRASHING_CHAOS_BUFF), this.onCCapply);
  }

  onChaosBoltCast() {
    if (this.selectedCombatant.hasBuff(SPELLS.CRASHING_CHAOS_BUFF.id)) {
      this._buffedChaosBolts += 1;
    }
  }

  onCCapply() {
    this._buffCount += 1;
  }

  get suggestionThresholds() {
    const avgChaosBoltsPerCC = (this._buffedChaosBolts / this._buffCount) || 0;
    return {
      actual: avgChaosBoltsPerCC,
      isLessThan: {
        minor: 5,
        average: 4,
        major: 3,
      },
      style: 'number',
    };
  }

  suggestions(when) {
    when(this.suggestionThresholds)
      .addSuggestion((suggest, actual, recommended) => {
        return suggest(<>You aren't utilizing the <SpellLink id={SPELLS.CRASHING_CHAOS.id} /> buff well enough. Try to pool Soul Shards and at least 1 <SpellLink id={SPELLS.CONFLAGRATE.id} /> stack before dropping Infernal and then cast as many Chaos Bolts as you can.</>)
          .icon(SPELLS.CRASHING_CHAOS.icon)
          .actual(`${actual} average Chaos Bolts per Crashing Chaos buff.`)
          .recommended(`> ${recommended} Chaos Bolts are recommended`);
      });
  }

  statistic() {
    const history = this.selectedCombatant.getBuffHistory(SPELLS.CRASHING_CHAOS_BUFF.id);
    const allProcs = history.length * STACKS_PER_PROC;
    const usedProcs = history.map(buff => STACKS_PER_PROC - buff.stacks).reduce((total, current) => total + current, 0);
    return (
      <TraitStatisticBox
        trait={SPELLS.CRASHING_CHAOS.id}
        value={<ItemDamageDone amount={this.core.crashingChaosDamage} approximate />}
        tooltip={`Estimated bonus Chaos Bolt damage: ${formatThousands(this.core.crashingChaosDamage)}<br />
                  You used ${usedProcs} out of ${allProcs} Crashing Chaos stacks.<br /><br />
                  The damage is an approximation using current Intellect values at given time, but because we might miss some Intellect buffs (e.g. trinkets, traits), the value of current Intellect might be a little incorrect.`}
      />
    );
  }
}

export default CrashingChaos;
