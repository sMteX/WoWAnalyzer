import EventNormalizer from 'parser/core/EventsNormalizer';

import PETS from '../PETS';
import { isPermanentPet, isWildImp } from '../helpers';

const DEMONIC_TYRANT_EXTENSION = 15000;
const debug = false;

class PetDespawnNormalizer extends EventNormalizer {
  // Tracking wasted Demonic Core procs seems to be almost impossible, since there are no events that indicate refreshing the buff
  // So even at max stacks, if you gain another proc, it just doesn't show up
  // What we can do though, is figure out when Demonic Cores are gained and try to determine if a waste happened

  // Demonic Core procs happen from several sources:
  //  1. When Wild Imp despawns from whatever reason, 10% chance to give DC immediately
  //  2. When Dreadstalkers despawn, 2 DCs after a brief moment (they behave like projectiles, flying back from target to player)
  //  3. If player has Supreme Commander trait, 1 DC immediately after Demonic Tyrant despawns

  // While fabricating an event for Wild Imps is rather easy (I track them all manually so I can trigger the event with EventEmitter)
  // Dreadstalkers and Demonic Tyrant are fixed length pets, which means I can't easily trigger an event for that
  // This Normalizer fabricates petdespawn events for all events EXCEPT Wild Imps, which are handled elsewhere

  tyrantQueue = [];

  normalize(events) {
    // When a known pet is summoned (fortunately, they raise a "summon" event), make a "petdespawn" event and place it in the events, but STORE A REFERENCE TO IT
    // When Demonic Tyrant is summoned, all pets that were active before it, and their respective events, are pushed 15 seconds further in the queue and the queue can be cleared
    for (let i = 0; i < events.length; i += 1) {
      const event = events[i];

      // Skip events that aren't summon events or are related to Wild Imps or permanent pets
      if (event.type !== 'summon' || this._targetIsImp(event) || this._targetIsPermanentPet(event)) {
        continue;
      }

      debug && this.log('Encountered summon - ', event);

      if (this._isTyrant(event)) {
        // We've summoned Demonic Tyrant, push all relevant pets in the tyrantQueue further 15 seconds
        // Filter out old pets
        this.tyrantQueue = this.tyrantQueue.filter(item => event.timestamp < item.expectedDespawn);
        debug && this.log('Tyrant summoned, current queue:', JSON.parse(JSON.stringify(this.tyrantQueue)));

        // Iterate backwards through the tyrantQueue (because we're messing with indices in the original array, moving the items from the end to the beginning doesn't mess the indices of the rest
        for (let j = this.tyrantQueue.length - 1; j >= 0; j -= 1) {
          const item = this.tyrantQueue[j];
          // remove the despawn event from events
          events.splice(item.indexInEvents, 1);
          // increase the timestamp
          item.event.timestamp += DEMONIC_TYRANT_EXTENSION;
          // place it back in events
          const targetIndex = events.findIndex(e => e.timestamp > item.event.timestamp);
          if (targetIndex === -1) {
            debug && this.log('Didn\'t find an index of event further in time than the despawn event - end of fight?');
            continue;
          }
          events.splice(targetIndex, 0, item.event);
        }
        // all pets have been pushed, clear the queue
        this.tyrantQueue = [];
      } else {
        // We've summoned a regular pet
        const despawnEvent = this._makeDespawnEvent(event);

        // find where to insert the new despawn event
        // find index of first event that has larger timestamp than the despawn event
        const targetIndex = events.findIndex(e => e.timestamp > despawnEvent.timestamp);
        // insert the despawn event in its place (it pushes it further)
        if (targetIndex === -1) {
          debug && this.log('Didn\'t find an index of event further in time than the despawn event - end of fight?');
          continue;
        }

        events.splice(targetIndex, 0, despawnEvent);

        this.tyrantQueue.push({
          expectedDespawn: despawnEvent.timestamp,
          indexInEvents: targetIndex,
          event: despawnEvent,
        });
        debug && this.log('Pushed a summon event into Tyrant queue, current queue: ', JSON.parse(JSON.stringify(this.tyrantQueue)));
      }
    }
    return events;
  }

  _isTyrant(event) {
    const guid = this._toGuid(event.targetID);
    return guid === PETS.DEMONIC_TYRANT.guid;
  }

  _makeDespawnEvent(sourceEvent) {
    const guid = this._toGuid(sourceEvent.targetID);
    return {
      timestamp: sourceEvent.timestamp + PETS[guid].duration,
      type: 'petdespawn',
      sourceID: sourceEvent.targetID,
      sourceInstance: sourceEvent.targetInstance,
      trigger: sourceEvent,
      __fabricated: true,
    };
  }

  _targetIsImp(event) {
    return isWildImp(this._toGuid(event.targetID));
  }

  _targetIsPermanentPet(event) {
    return isPermanentPet(this._toGuid(event.targetID));
  }

  _getPetInfo(id, isGuid = false) {
    let pet;
    if (isGuid) {
      pet = this.owner.playerPets.find(pet => pet.guid === id);
    }
    else {
      pet = this.owner.playerPets.find(pet => pet.id === id);
    }
    if (!pet) {
      debug && this.error(`NewPets._getPetInfo() called with nonexistant pet ${isGuid ? 'gu' : ''}id ${id}`);
      return null;
    }
    return pet;
  }

  _toGuid(id) {
    return this._getPetInfo(id).guid;
  }
}

export default PetDespawnNormalizer;
