import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TaxonomyController } from '../src/modules/taxonomy/taxonomy.controller';

/**
 * Taxonomy controller ships the dynamic dropdown source data (public reads)
 * plus the admin CRUD surface for education levels, curricula, streams,
 * institutions, and subjects. The controller talks to repositories directly,
 * so every repository is mocked here.
 */
describe('TaxonomyController Public Reads & Admin CRUD Tests', () => {
  let controller: TaxonomyController;
  let subjectRepo: any;
  let levelRepo: any;
  let curriculumRepo: any;
  let streamRepo: any;
  let institutionRepo: any;

  function makeRepo() {
    return {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((data: Record<string, unknown>) => ({ id: 'generated-1', ...data })),
      save: vi.fn((entity: Record<string, unknown>) => Promise.resolve(entity)),
    };
  }

  beforeEach(() => {
    subjectRepo = makeRepo();
    levelRepo = makeRepo();
    curriculumRepo = makeRepo();
    streamRepo = makeRepo();
    institutionRepo = { ...makeRepo(), createQueryBuilder: vi.fn() };

    controller = new TaxonomyController(
      subjectRepo,
      levelRepo,
      curriculumRepo,
      streamRepo,
      institutionRepo,
    );
  });

  describe('Public dropdown reads', () => {
    it('should list only active subjects ordered by English name by default', async () => {
      subjectRepo.find.mockResolvedValue([{ id: 'subj-1', isActive: true }]);

      const res = await controller.getSubjects();

      expect(subjectRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { nameEn: 'ASC' },
      });
      expect(res).toEqual({ success: true, data: [{ id: 'subj-1', isActive: true }] });
    });

    it('should include inactive subjects for admin management when all=true', async () => {
      await controller.getSubjects('true');

      expect(subjectRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { nameEn: 'ASC' },
      });
    });

    it('should gate education levels on activity and order by sortOrder', async () => {
      await controller.getEducationLevels();
      expect(levelRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { sortOrder: 'ASC' },
      });

      await controller.getEducationLevels('true');
      expect(levelRepo.find).toHaveBeenLastCalledWith({
        where: {},
        order: { sortOrder: 'ASC' },
      });
    });

    it('should serve the static Bangladesh location directory with bilingual names', async () => {
      const res = await controller.getLocations();

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(12);
      expect(res.data).toContainEqual(
        expect.objectContaining({ code: 'dhaka', nameEn: 'Dhaka', nameBn: 'ঢাকা' }),
      );
      expect(res.data).toContainEqual(
        expect.objectContaining({ code: 'chittagong', division: 'Chattogram' }),
      );
    });

    it('should apply institution filters and cap the page size at 200', async () => {
      const qb: any = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([{ id: 'inst-1' }]),
      };
      institutionRepo.createQueryBuilder.mockReturnValue(qb);

      const res = await controller.getInstitutions(undefined, 'ideal', 'school', 'dhaka', '999');

      expect(qb.where).toHaveBeenCalledWith('inst.isActive = :active', { active: true });
      expect(qb.andWhere).toHaveBeenCalledWith('inst.type = :type', { type: 'school' });
      expect(qb.andWhere).toHaveBeenCalledWith('inst.district ILIKE :district', {
        district: '%dhaka%',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(inst.nameEn ILIKE :search OR inst.nameBn ILIKE :search OR inst.code ILIKE :search)',
        { search: '%ideal%' },
      );
      expect(qb.take).toHaveBeenCalledWith(200);
      expect(res.data).toEqual([{ id: 'inst-1' }]);
    });

    it('should skip the active gate for institutions when all=true', async () => {
      const qb: any = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };
      institutionRepo.createQueryBuilder.mockReturnValue(qb);

      await controller.getInstitutions('true');

      expect(qb.where).not.toHaveBeenCalled();
      expect(qb.take).toHaveBeenCalledWith(100);
    });
  });

  describe('Admin CRUD', () => {
    it('should reject a duplicate education level code with 409 Conflict', async () => {
      levelRepo.findOne.mockResolvedValue({ id: 'lvl-existing', code: 'hsc' });

      await expect(
        controller.createEducationLevel({
          code: 'hsc',
          nameEn: 'Higher Secondary',
          nameBn: 'উচ্চ মাধ্যমিক',
        }),
      ).rejects.toThrow(ConflictException);
      expect(levelRepo.save).not.toHaveBeenCalled();
    });

    it('should create an education level with default sortOrder and activity', async () => {
      const res = await controller.createEducationLevel({
        code: 'ssc',
        nameEn: 'Secondary',
        nameBn: 'মাধ্যমিক',
      });

      expect(levelRepo.create).toHaveBeenCalledWith({
        code: 'ssc',
        nameEn: 'Secondary',
        nameBn: 'মাধ্যমিক',
        sortOrder: 0,
        isActive: true,
      });
      expect(res.success).toBe(true);
      expect(res.data.code).toBe('ssc');
    });

    it('should 404 when updating a missing education level', async () => {
      levelRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.updateEducationLevel('missing-id', { nameEn: 'Nope' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should apply partial education level updates without clobbering untouched fields', async () => {
      levelRepo.findOne.mockResolvedValue({
        id: 'lvl-1',
        code: 'hsc',
        nameEn: 'Higher Secondary',
        nameBn: 'উচ্চ মাধ্যমিক',
        sortOrder: 2,
        isActive: true,
      });

      const res = await controller.updateEducationLevel('lvl-1', {
        nameEn: 'HSC (11-12)',
        isActive: false,
      });

      expect(res.data).toMatchObject({
        id: 'lvl-1',
        nameEn: 'HSC (11-12)',
        nameBn: 'উচ্চ মাধ্যমিক',
        sortOrder: 2,
        isActive: false,
      });
    });

    it('should deactivate rather than hard-delete an education level', async () => {
      const level = { id: 'lvl-1', code: 'hsc', isActive: true };
      levelRepo.findOne.mockResolvedValue(level);

      const res = await controller.deleteEducationLevel('lvl-1');

      expect(levelRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
      expect(res).toEqual({ success: true, message: 'Education level deactivated' });
    });

    it('should create a subject with the academic category default and reject duplicates', async () => {
      const res = await controller.createSubject({
        code: 'phy',
        nameEn: 'Physics',
        nameBn: 'পদার্থবিজ্ঞান',
      });

      expect(subjectRepo.create).toHaveBeenCalledWith({
        code: 'phy',
        nameEn: 'Physics',
        nameBn: 'পদার্থবিজ্ঞান',
        category: 'academic',
        isActive: true,
      });
      expect(res.data.category).toBe('academic');

      subjectRepo.findOne.mockResolvedValue({ id: 'subj-exists' });
      await expect(
        controller.createSubject({ code: 'phy', nameEn: 'Physics', nameBn: 'পদার্থবিজ্ঞান' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create an institution with default type and nullable geography', async () => {
      await controller.createInstitution({
        code: 'ndc',
        nameEn: 'Notre Dame College',
        nameBn: 'নটর ডেম কলেজ',
      });

      expect(institutionRepo.create).toHaveBeenCalledWith({
        code: 'ndc',
        nameEn: 'Notre Dame College',
        nameBn: 'নটর ডেম কলেজ',
        type: 'school_and_college',
        district: null,
        division: null,
        sortOrder: 0,
        isActive: true,
      });
    });

    it('should 404 when deleting a missing subject and deactivate an existing one otherwise', async () => {
      subjectRepo.findOne.mockResolvedValue(null);
      await expect(controller.deleteSubject('missing-id')).rejects.toThrow(NotFoundException);

      subjectRepo.findOne.mockResolvedValue({ id: 'subj-1', isActive: true });
      const res = await controller.deleteSubject('subj-1');
      expect(subjectRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
      expect(res).toEqual({ success: true, message: 'Subject deactivated' });
    });

    it('should 404 when updating a missing curriculum and update the board name otherwise', async () => {
      curriculumRepo.findOne.mockResolvedValue(null);
      await expect(controller.updateCurriculum('missing-id', { nameEn: 'Nope' })).rejects.toThrow(
        NotFoundException,
      );

      curriculumRepo.findOne.mockResolvedValue({
        id: 'cur-1',
        nameEn: 'National Curriculum',
        nameBn: 'জাতীয় শিক্ষাক্রম',
        boardName: null,
        isActive: true,
      });
      const res = await controller.updateCurriculum('cur-1', { boardName: 'Dhaka Board' });
      expect(res.data).toMatchObject({ boardName: 'Dhaka Board', nameEn: 'National Curriculum' });
    });

    it('should deactivate a stream and 404 on unknown stream ids', async () => {
      streamRepo.findOne.mockResolvedValue(null);
      await expect(controller.deleteStream('missing-id')).rejects.toThrow(NotFoundException);

      streamRepo.findOne.mockResolvedValue({ id: 'stream-1', isActive: true });
      const res = await controller.deleteStream('stream-1');
      expect(streamRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
      expect(res).toEqual({ success: true, message: 'Stream deactivated' });
    });
  });
});
