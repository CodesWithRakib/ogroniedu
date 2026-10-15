import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { isAdminRole } from '../auth/role.utils';

@Injectable()
export class GuardianStudentGuard implements CanActivate {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user) {
      throw new ForbiddenException('User context missing');
    }

    // Admins have access across students
    if (isAdminRole(user)) {
      return true;
    }

    const targetStudentId = request.params.studentId || request.params.id;
    if (!targetStudentId) {
      return true;
    }

    // If the user IS the target student
    if (user.id === targetStudentId) {
      return true;
    }

    // If the user is a guardian, verify active relationship
    if (user.roles.includes('guardian')) {
      const result = await this.dataSource.query(
        `SELECT 1 FROM guardian_student_links 
         WHERE guardian_user_id = $1 
           AND student_user_id = $2 
           AND status = 'active' 
         LIMIT 1;`,
        [user.id, targetStudentId],
      );

      if (result && result.length > 0) {
        return true;
      }
    }

    throw new ForbiddenException(
      'Access denied: You do not have verified authorization or an active guardian link to this student.',
    );
  }
}
