import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getMetadataArgsStorage } from 'typeorm';

// Import every entity so decorator metadata is registered.
import { BookingEntity } from '../src/modules/bookings/entities/booking.entity';
import { BookingSessionEntity } from '../src/modules/bookings/entities/booking-session.entity';
import { BookingMessageEntity } from '../src/modules/notifications/entities/booking-message.entity';
import { UserEntity } from '../src/modules/auth/entities/user.entity';
import { TutorProfileEntity } from '../src/modules/tutors/entities/tutor-profile.entity';
import { SubjectEntity } from '../src/modules/taxonomy/entities/subject.entity';
import { EducationLevelEntity } from '../src/modules/taxonomy/entities/education-level.entity';
import { GuardianStudentLinkEntity } from '../src/modules/guardians/entities/guardian-student-link.entity';
import { AssignmentEntity } from '../src/modules/learning/entities/assignment.entity';
import { SessionAttendanceEntity } from '../src/modules/learning/entities/session-attendance.entity';

const ENTITIES = [
  BookingEntity,
  BookingSessionEntity,
  BookingMessageEntity,
  UserEntity,
  TutorProfileEntity,
  SubjectEntity,
  EducationLevelEntity,
  GuardianStudentLinkEntity,
  AssignmentEntity,
  SessionAttendanceEntity,
] as const;

type EntityCtor = { name: string };

function relationMap(): Map<string, { props: Set<string>; targets: Map<string, EntityCtor> }> {
  const storage = getMetadataArgsStorage();
  const out = new Map<string, { props: Set<string>; targets: Map<string, EntityCtor> }>();
  for (const entity of ENTITIES as readonly EntityCtor[]) {
    out.set(entity.name, { props: new Set(), targets: new Map() });
  }
  for (const rel of storage.relations as Array<{
    target: EntityCtor | Function;
    propertyName: string;
    type: EntityCtor | (() => EntityCtor);
  }>) {
    const target = typeof rel.target === 'function' ? (rel.target as EntityCtor) : rel.target;
    const entry = out.get(target.name);
    if (!entry) continue;
    entry.props.add(rel.propertyName);
    const type =
      typeof rel.type === 'function' && !('name' in rel.type && (rel.type as EntityCtor).name)
        ? (rel.type as () => EntityCtor)()
        : (rel.type as EntityCtor);
    entry.targets.set(rel.propertyName, type);
  }
  return out;
}

function serviceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && p.endsWith('.service.ts')) out.push(p);
    }
  };
  walk(root);
  return out;
}

/**
 * Regression test for the admin-bookings 500 (Phase 24): query-builder join
 * paths are plain strings TypeScript cannot check, so this spec resolves
 * every `JoinAndSelect('alias.relation')` in services against live TypeORM
 * decorator metadata and fails on unknown relations.
 */
describe('query-builder join paths reference real relations', () => {
  it('every join alias.relation resolves in decorator metadata', () => {
    const relations = relationMap();
    const bySimpleName = new Map<string, string>();
    for (const name of relations.keys()) bySimpleName.set(name, name);

    const root = path.resolve(__dirname, '../src/modules');
    const violations: string[] = [];

    for (const file of serviceFiles(root)) {
      const text = fs.readFileSync(file, 'utf8');
      // repo var -> entity: "@InjectRepository(FooEntity) private readonly fooRepo"
      const repoEntity = new Map<string, string>();
      for (const m of text.matchAll(/@InjectRepository\((\w+)\)\s+private readonly (\w+)/g)) {
        repoEntity.set(m[2], m[1]);
      }
      // qb roots: "this.fooRepo.createQueryBuilder('alias')" (may span lines)
      const aliasEntity = new Map<string, string>();
      for (const m of text.matchAll(/this\.(\w+)\s*\.\s*createQueryBuilder\(\s*'(\w+)'/g)) {
        const entity = repoEntity.get(m[1]);
        if (entity) aliasEntity.set(m[2], entity);
      }
      // joins: ".leftJoinAndSelect('alias.relation', 'next')" (+ inner variants)
      for (const m of text.matchAll(/\.\w*Join\w*\(\s*'(\w+)\.(\w+)'\s*,\s*'(\w+)'/g)) {
        const [, alias, relation, nextAlias] = m;
        const entity = aliasEntity.get(alias);
        if (!entity) {
          violations.push(`${path.basename(file)}: unknown alias '${alias}'`);
          continue;
        }
        const entry = relations.get(entity);
        if (!entry) {
          violations.push(`${path.basename(file)}: entity '${entity}' not in metadata map`);
          continue;
        }
        if (!entry.props.has(relation)) {
          violations.push(
            `${path.basename(file)}: '${alias}.${relation}' — '${entity}' has no such relation ` +
              `(has: ${[...entry.props].join(', ') || 'none'})`,
          );
          continue;
        }
        const target = entry.targets.get(relation);
        if (target && bySimpleName.has(target.name)) aliasEntity.set(nextAlias, target.name);
      }
    }

    expect(violations).toEqual([]);
  });

  it('pins the previously broken admin-bookings joins to real relations', () => {
    const relations = relationMap();
    const booking = relations.get('BookingEntity');
    expect(booking).toBeDefined();
    for (const rel of [
      'requesterUser',
      'studentUser',
      'tutorProfile',
      'subject',
      'educationLevel',
    ]) {
      expect(booking!.props.has(rel), `BookingEntity must expose '${rel}'`).toBe(true);
    }
  });
});
