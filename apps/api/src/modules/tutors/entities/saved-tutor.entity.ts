import { Entity, PrimaryColumn, CreateDateColumn } from 'typeorm';

/**
 * A user's private tutor shortlist. The composite primary key makes duplicate
 * saves impossible at the database level; access is always scoped by `userId`
 * in the service, so one user can never read another user's list.
 */
@Entity('saved_tutors')
export class SavedTutorEntity {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId!: string;

  @PrimaryColumn('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
