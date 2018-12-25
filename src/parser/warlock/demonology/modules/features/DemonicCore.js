import React from 'react';

import Analyzer from 'parser/core/Analyzer';

import SPELLS from 'common/SPELLS';
import SpellLink from 'common/SpellLink';

import SoulShardTracker from '../soulshards/SoulShardTracker';

class DemonicCore extends Analyzer {
  static dependencies = {
    soulShardTracker: SoulShardTracker,
  };

  get wastedShardsSuggestionThresholds() {
    const shardsWasted = this.soulShardTracker.getWastedBySpell(SPELLS.DEMONBOLT_SHARD_GEN.id);
    const shardsWastedPerMinute = (shardsWasted / this.owner.fightDuration) * 1000 * 60;
    return {
      actual: shardsWastedPerMinute,
      isGreaterThan: {
        minor: 1,
        average: 2,
        major: 4,
      },
      style: 'number',
    };
  }

  suggestions(when) {
    const shardsWasted = this.soulShardTracker.getWastedBySpell(SPELLS.DEMONBOLT_SHARD_GEN.id);
    when(this.wastedShardsSuggestionThresholds)
      .addSuggestion((suggest, actual, recommended) => {
        return suggest(<>You are wasting Soul Shards with <SpellLink id={SPELLS.DEMONBOLT.id} />. Use <SpellLink id={SPELLS.DEMONIC_CORE_BUFF.id} /> stacks when you're at 0 - 3 shards to not waste any.</>)
          .icon(SPELLS.DEMONIC_CORE_BUFF.icon)
          .actual(`${shardsWasted} Soul Shards wasted (${actual.toFixed(2)} per minute)`)
          .recommended(`< ${recommended} Soul Shards per minute wasted are recommended`);
      });
  }
}

export default DemonicCore;
