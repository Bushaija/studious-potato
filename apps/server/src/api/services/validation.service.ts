import { HTTPException } from 'hono/http-exception';
import { inArray } from 'drizzle-orm';
import { db } from '@/api/db';
import * as schema from '@/api/db/schema';
import { VALID_PERMISSIONS } from '../constants/permissions';

export class ValidationService {
  /**
   * Validates that all permissions in the array are valid
   * @param permissions - Array of permission strings to validate
   * @throws HTTPException with 400 status if any permissions are invalid
   */
  static async validatePermissions(permissions: string[]): Promise<void> {
    if (!permissions || permissions.length === 0) {
      return;
    }

    const invalidPerms = permissions.filter(
      (p) => !VALID_PERMISSIONS.includes(p as any)
    );

    if (invalidPerms.length > 0) {
      throw new HTTPException(400, {
        message: `Invalid permissions: ${invalidPerms.join(', ')}`,
      });
    }
  }

  /**
   * Validates that all project IDs exist in the database
   * @param projectIds - Array of project IDs to validate
   * @throws HTTPException with 400 status if any project IDs are invalid
   */
  static async validateProjectAccess(projectIds: number[]): Promise<void> {
    if (!projectIds || projectIds.length === 0) {
      return;
    }

    const validProjects = await db.query.projects.findMany({
      where: inArray(schema.projects.id, projectIds),
      columns: {
        id: true,
      },
    });

    if (validProjects.length !== projectIds.length) {
      const validIds = validProjects.map((p) => p.id);
      const invalidIds = projectIds.filter((id) => !validIds.includes(id));
      throw new HTTPException(400, {
        message: `Invalid project IDs: ${invalidIds.join(', ')}`,
      });
    }
  }
}
