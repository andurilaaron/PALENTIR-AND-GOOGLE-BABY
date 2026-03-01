/**
 * ShotPlannerStore — Save and recall camera positions using localStorage.
 *
 * Each "shot" stores: name, position (lon, lat, height), heading, pitch, roll.
 */

export interface CameraShot {
    id: string;
    name: string;
    longitude: number;
    latitude: number;
    height: number;
    heading: number;
    pitch: number;
    roll: number;
    createdAt: number;
}

const STORAGE_KEY = "palentir_camera_shots";

class _ShotPlannerStore {
    private shots: CameraShot[] = [];
    private listeners: Set<() => void> = new Set();

    constructor() {
        this.load();
    }

    getAll(): CameraShot[] {
        return [...this.shots];
    }

    save(shot: Omit<CameraShot, "id" | "createdAt">): CameraShot {
        const newShot: CameraShot = {
            ...shot,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
        };
        this.shots.push(newShot);
        this.persist();
        this.notify();
        return newShot;
    }

    remove(id: string): void {
        this.shots = this.shots.filter((s) => s.id !== id);
        this.persist();
        this.notify();
    }

    clear(): void {
        this.shots = [];
        this.persist();
        this.notify();
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private load(): void {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                this.shots = JSON.parse(raw);
            }
        } catch {
            console.warn("[ShotPlannerStore] Failed to load saved shots");
            this.shots = [];
        }
    }

    private persist(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.shots));
        } catch {
            console.warn("[ShotPlannerStore] Failed to persist shots");
        }
    }

    private notify(): void {
        for (const l of this.listeners) l();
    }
}

export const ShotPlannerStore = new _ShotPlannerStore();
