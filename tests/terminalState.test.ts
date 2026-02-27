import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTerminalState, hasNonTerminalStopUpdate } from '../src/utils/terminalState';

const TERMINAL_STOP_NAMES: Record<string, string> = {
    '9005': 'Platform 5',
    '9006': 'Platform 6',
};

const GEOFENCE_OVERRIDES = [
    {
        routeId: '8A',
        directionId: 0,
        stopName: 'Platform 5',
        lat: 44.3739253,
        lon: -79.6897531,
        radiusMeters: 120,
    },
];

test('classifies stale stopId near platform as arrived when moving very slowly', () => {
    const state = classifyTerminalState(
        {
            id: 'bus-1',
            lat: 44.3739357,
            lon: -79.6893616,
            routeId: '8A',
            directionId: 0,
            currentStatus: 2,
            speed: 0.5,
            stopId: '725',
        },
        TERMINAL_STOP_NAMES,
        GEOFENCE_OVERRIDES,
    );

    assert.equal(state.geofenceInArea, true);
    assert.equal(state.atTerminal, true);
    assert.equal(state.arriving, false);
    assert.equal(state.platformName, 'Platform 5');
});

test('classifies stale stopId near platform as arriving when speed is high', () => {
    const state = classifyTerminalState(
        {
            id: 'bus-2',
            lat: 44.3739357,
            lon: -79.6893616,
            routeId: '8A',
            directionId: 0,
            currentStatus: 2,
            speed: 6.0,
            stopId: '725',
        },
        TERMINAL_STOP_NAMES,
        GEOFENCE_OVERRIDES,
    );

    assert.equal(state.atTerminal, false);
    assert.equal(state.arriving, true);
    assert.equal(state.platformName, 'Platform 5');
});

test('does not activate terminal state from geofence alone without supported status', () => {
    const state = classifyTerminalState(
        {
            id: 'bus-3',
            lat: 44.3739357,
            lon: -79.6893616,
            routeId: '8A',
            directionId: 0,
            speed: 0.0,
            stopId: '725',
        },
        TERMINAL_STOP_NAMES,
        GEOFENCE_OVERRIDES,
    );

    assert.equal(state.atTerminal, false);
    assert.equal(state.arriving, false);
});

test('treats IN_TRANSIT_TO at a terminal stop as arriving', () => {
    const state = classifyTerminalState(
        {
            id: 'bus-4',
            lat: 44.374,
            lon: -79.6898,
            routeId: '8A',
            directionId: 0,
            currentStatus: 2,
            speed: 4.0,
            stopId: '9005',
        },
        TERMINAL_STOP_NAMES,
        GEOFENCE_OVERRIDES,
    );

    assert.equal(state.atTerminal, false);
    assert.equal(state.arriving, true);
    assert.equal(state.platformName, 'Platform 5');
});

test('treats STOPPED_AT at a terminal stop as arrived', () => {
    const state = classifyTerminalState(
        {
            id: 'bus-5',
            lat: 44.374,
            lon: -79.6898,
            routeId: '8A',
            directionId: 0,
            currentStatus: 1,
            speed: 0.0,
            stopId: '9005',
        },
        TERMINAL_STOP_NAMES,
        GEOFENCE_OVERRIDES,
    );

    assert.equal(state.atTerminal, true);
    assert.equal(state.arriving, false);
});

test('detects explicit non-terminal stop updates', () => {
    const nonTerminal = hasNonTerminalStopUpdate(
        {
            id: 'bus-6',
            lat: 44.37,
            lon: -79.68,
            stopId: '725',
        },
        TERMINAL_STOP_NAMES,
    );
    const terminal = hasNonTerminalStopUpdate(
        {
            id: 'bus-7',
            lat: 44.37,
            lon: -79.68,
            stopId: '9005',
        },
        TERMINAL_STOP_NAMES,
    );

    assert.equal(nonTerminal, true);
    assert.equal(terminal, false);
});
