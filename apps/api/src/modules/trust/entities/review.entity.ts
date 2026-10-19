import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { BookingEntity } from '../../bookings/entities/booking.entity';

export type ReviewModerationStatus = 'pending' | 'published' | 'flagged' | 'hidden';

@Entity('reviews')
@Unique('uq_review_booking_reviewer', ['bookingId', 'reviewerUserId'])
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'booking_id' })
  bookingId!: string;

  @Column('uuid', { name: 'reviewer_user_id' })
  reviewerUserId!: string;

  @Column('uuid', { name: 'tutor_user_id' })
  tutorUserId!: string;

  @Column({ type: 'smallint' })
  rating!: number;

  @Column({ name: 'punctuality_rating', type: 'smallint', nullable: true })
  punctualityRating?: number | null;

  @Column({ name: 'teaching_clarity_rating', type: 'smallint', nullable: true })
  teachingClarityRating?: number | null;

  @Column({ name: 'subject_mastery_rating', type: 'smallint', nullable: true })
  subjectMasteryRating?: number | null;

  @Column({ type: 'text' })
  comment!: string;

  @Column({ name: 'comment_en', type: 'text', nullable: true })
  commentEn?: string | null;

  @Column({ name: 'comment_bn', type: 'text', nullable: true })
  commentBn?: string | null;

  @Column({
    name: 'moderation_status',
    type: 'text',
    default: 'published',
  })
  moderationStatus!: ReviewModerationStatus;

  @Column({
    name: 'policy_version',
    type: 'text',
    default: 'v1.0-fair-reviews',
  })
  policyVersion!: string;

  @Column({ name: 'tutor_response', type: 'text', nullable: true })
  tutorResponse?: string | null;

  @Column({ name: 'tutor_response_en', type: 'text', nullable: true })
  tutorResponseEn?: string | null;

  @Column({ name: 'tutor_response_bn', type: 'text', nullable: true })
  tutorResponseBn?: string | null;

  @Column({ name: 'tutor_responded_at', type: 'timestamptz', nullable: true })
  tutorRespondedAt?: Date | null;

  @Column({ name: 'is_verified_booking', type: 'boolean', default: true })
  isVerifiedBooking!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'reviewer_user_id' })
  reviewer?: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'tutor_user_id' })
  tutorUser?: UserEntity;
}
