import React from 'react';

import Analyzer from 'parser/core/Analyzer';

import SPELLS from 'common/SPELLS';
import SpellLink from 'common/SpellLink';
import SpellIcon from 'common/SpellIcon';

import StatisticBox from 'interface/others/StatisticBox';

import SoulShardTracker from '../soulshards/SoulShardTracker';

class DemonicCore extends Analyzer {
  static dependencies = {
    soulShardTracker: SoulShardTracker,
  };

  // TODO: figure out how to track this
  _wastedCores = 0;

  // dreadstalkers - 2 cores sometimes after despawn (the cores are like a projectile)
  // demonic tyrant - 1 core immediately after despawn (the pet itself, NOT the buff)
  // imps - 10% chance for a core immediately after their despawn

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

  get wastedCoresSuggestionThresholds() {
    const wastedCoresPerMinute = (this._wastedCores / this.owner.fightDuration) * 1000 * 60;
    return {
      actual: wastedCoresPerMinute,
      isGreaterThan: {
        minor: 0.5,
        average: 1,
        major: 1.5,
      },
      style: 'number',
    };
  }

  suggestions(when) {
    const shardsWasted = this.soulShardTracker.getWastedBySpell(SPELLS.DEMONBOLT_SHARD_GEN.id);
    const hasSB = this.selectedCombatant.hasTrait(SPELLS.SHADOWS_BITE.id);
    when(this.wastedShardsSuggestionThresholds)
      .addSuggestion((suggest, actual, recommended) => {
        return suggest(<>You are wasting Soul Shards with <SpellLink id={SPELLS.DEMONBOLT.id} />. Use <SpellLink id={SPELLS.DEMONIC_CORE_BUFF.id} /> stacks when you're at 0 - 3 shards to not waste any.</>)
          .icon(SPELLS.DEMONIC_CORE_BUFF.icon)
          .actual(`${shardsWasted} Soul Shards wasted (${actual.toFixed(2)} per minute)`)
          .recommended(`< ${recommended} Soul Shards per minute wasted are recommended`);
      });
    when(this.wastedCoresSuggestionThresholds)
      .addSuggestion((suggest, actual, recommended) => {
        return suggest(<>You are wasting <SpellLink id={SPELLS.DEMONIC_CORE_BUFF.id} /> procs. Try to not let them cap unless you are preparing for burst phases{hasSB ? <> or <SpellLink id={SPELLS.SHADOWS_BITE.id} /> window</> : ''}.</>)
          .icon(SPELLS.DEMONIC_CORE_BUFF.icon)
          .actual(`${actual} wasted Demonic Cores per minute`)
          .recommended(`< ${recommended.toFixed(1)} wasted Demonic Cores per minute are recommended`);
      });
  }

  statistic() {
    const shardsWasted = this.soulShardTracker.getWastedBySpell(SPELLS.DEMONBOLT_SHARD_GEN.id);
    return (
      <StatisticBox
        icon={<SpellIcon id={SPELLS.DEMONIC_CORE_BUFF.id} />}
        value={(
          <>
            {this._wastedCores} wasted Cores<br />
            {shardsWasted} wasted Shards
          </>
        )}
        label="Demonic Core"
      />
    );
  }
}

export default DemonicCore;
