import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@adapters/guards/jwt-auth.guard';
import type { User } from '@domain/entities/user.entity';
import type { Request } from 'express';

// DTOs
import { CreateLeagueDto } from '@adapters/dtos/league/create-league.dto';
import { UpdateLeagueDto } from '@adapters/dtos/league/update-league.dto';
import { JoinLeagueDto } from '@adapters/dtos/league/join-league.dto';
import { TransferAdminDto } from '@adapters/dtos/league/transfer-admin.dto';
import { LeagueResponseDto } from '@adapters/dtos/league/league-response.dto';
import { UserResponseDto } from '@adapters/dtos/user/user-response.dto';

// Use Cases
import { CreateLeagueUseCase } from '@application/use-cases/leagues/create-league.use-case';
import { GetLeagueByIdUseCase } from '@application/use-cases/leagues/get-league-by-id.use-case';
import { GetAllLeaguesUseCase } from '@application/use-cases/leagues/get-all-leagues.use-case';
import { GetPublicLeaguesUseCase } from '@application/use-cases/leagues/get-public-leagues.use-case';
import { GetUserLeaguesUseCase } from '@application/use-cases/leagues/get-user-leagues.use-case';
import { UpdateLeagueUseCase } from '@application/use-cases/leagues/update-league.use-case';
import { DeleteLeagueUseCase } from '@application/use-cases/leagues/delete-league.use-case';
import { JoinLeagueUseCase } from '@application/use-cases/leagues/join-league.use-case';
import { LeaveLeagueUseCase } from '@application/use-cases/leagues/leave-league.use-case';
import { RemoveMemberUseCase } from '@application/use-cases/leagues/remove-member.use-case';
import { TransferAdminUseCase } from '@application/use-cases/leagues/transfer-admin.use-case';
import { GetLeagueMembersUseCase } from '@application/use-cases/leagues/get-league-members.use-case';
import { Inject } from '@nestjs/common';
import type { ILeagueRepository } from '@domain/repositories/league.repository.interface';

/**
 * Extend Express Request para incluir user
 */
interface RequestWithUser extends Request {
  user: User;
}

/**
 * LeagueController (Adapters Layer)
 *
 * Controlador REST que maneja los endpoints HTTP relacionados con ligas.
 *
 * Responsabilidades:
 * 1. Recibir requests HTTP y validar DTOs
 * 2. Delegar lógica de negocio a Use Cases
 * 3. Transformar entidades League a LeagueResponseDto
 * 4. Retornar respuestas HTTP con códigos de estado apropiados
 *
 * Endpoints disponibles:
 * - POST   /leagues                        - Crear liga
 * - GET    /leagues                        - Listar todas las ligas
 * - GET    /leagues/public                 - Listar ligas públicas
 * - GET    /leagues/my                     - Listar mis ligas
 * - GET    /leagues/:id                    - Obtener liga por ID
 * - PATCH  /leagues/:id                    - Actualizar liga (solo admin)
 * - DELETE /leagues/:id                    - Eliminar liga (solo admin)
 * - POST   /leagues/:id/join               - Unirse a liga
 * - DELETE /leagues/:id/leave              - Salir de liga
 * - GET    /leagues/:id/members            - Listar miembros
 * - DELETE /leagues/:id/members/:userId    - Expulsar miembro (solo admin)
 * - PATCH  /leagues/:id/transfer-admin     - Transferir admin (solo admin)
 *
 * Todos los endpoints requieren autenticación JWT.
 */
@ApiTags('Leagues')
@Controller('leagues')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LeagueController {
  constructor(
    @Inject('ILeagueRepository')
    private readonly leagueRepository: ILeagueRepository,
    private readonly createLeagueUseCase: CreateLeagueUseCase,
    private readonly getLeagueByIdUseCase: GetLeagueByIdUseCase,
    private readonly getAllLeaguesUseCase: GetAllLeaguesUseCase,
    private readonly getPublicLeaguesUseCase: GetPublicLeaguesUseCase,
    private readonly getUserLeaguesUseCase: GetUserLeaguesUseCase,
    private readonly updateLeagueUseCase: UpdateLeagueUseCase,
    private readonly deleteLeagueUseCase: DeleteLeagueUseCase,
    private readonly joinLeagueUseCase: JoinLeagueUseCase,
    private readonly leaveLeagueUseCase: LeaveLeagueUseCase,
    private readonly removeMemberUseCase: RemoveMemberUseCase,
    private readonly transferAdminUseCase: TransferAdminUseCase,
    private readonly getLeagueMembersUseCase: GetLeagueMembersUseCase,
  ) {}

  /**
   * POST /leagues
   * Crear una nueva liga
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new league',
    description:
      'Create a new league (public or private). Requires payment and email verification. Admin is automatically added as first member. Invite code is generated automatically for private leagues.',
  })
  @ApiBody({ type: CreateLeagueDto })
  @ApiResponse({
    status: 201,
    description: 'League created successfully',
    type: LeagueResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Payment or email verification required',
  })
  async create(
    @Body() createLeagueDto: CreateLeagueDto,
    @Req() req: RequestWithUser,
  ): Promise<LeagueResponseDto> {
    const league = await this.createLeagueUseCase.execute({
      ...createLeagueDto,
      adminUserId: req.user.id,
    });

    const memberCount = await this.leagueRepository.getMemberCount(league.id);

    return LeagueResponseDto.fromEntity(league, req.user.id, true, memberCount);
  }

  /**
   * GET /leagues
   * Listar todas las ligas
   */
  @Get()
  @ApiOperation({
    summary: 'Get all leagues',
    description: 'Retrieve all leagues (public and private)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all leagues',
    type: [LeagueResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Req() req: RequestWithUser): Promise<LeagueResponseDto[]> {
    const leagues = await this.getAllLeaguesUseCase.execute();

    // Obtener membresía y conteo para cada liga
    const membershipMap = new Map<string, boolean>();
    const memberCountMap = new Map<string, number>();

    await Promise.all(
      leagues.map(async (league) => {
        const isMember = await this.leagueRepository.isMember(
          league.id,
          req.user.id,
        );
        const count = await this.leagueRepository.getMemberCount(league.id);
        membershipMap.set(league.id, isMember);
        memberCountMap.set(league.id, count);
      }),
    );

    return LeagueResponseDto.fromEntities(
      leagues,
      req.user.id,
      membershipMap,
      memberCountMap,
    );
  }

  /**
   * GET /leagues/public
   * Listar solo ligas públicas
   */
  @Get('public')
  @ApiOperation({
    summary: 'Get public leagues',
    description: 'Retrieve only public leagues (available to join without invite code)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of public leagues',
    type: [LeagueResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findPublic(@Req() req: RequestWithUser): Promise<LeagueResponseDto[]> {
    const leagues = await this.getPublicLeaguesUseCase.execute();

    const membershipMap = new Map<string, boolean>();
    const memberCountMap = new Map<string, number>();

    await Promise.all(
      leagues.map(async (league) => {
        const isMember = await this.leagueRepository.isMember(
          league.id,
          req.user.id,
        );
        const count = await this.leagueRepository.getMemberCount(league.id);
        membershipMap.set(league.id, isMember);
        memberCountMap.set(league.id, count);
      }),
    );

    return LeagueResponseDto.fromEntities(
      leagues,
      req.user.id,
      membershipMap,
      memberCountMap,
    );
  }

  /**
   * GET /leagues/my
   * Listar mis ligas
   */
  @Get('my')
  @ApiOperation({
    summary: 'Get my leagues',
    description: 'Retrieve all leagues where the current user is a member',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user leagues',
    type: [LeagueResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMy(@Req() req: RequestWithUser): Promise<LeagueResponseDto[]> {
    const leagues = await this.getUserLeaguesUseCase.execute(req.user.id);

    const memberCountMap = new Map<string, number>();

    await Promise.all(
      leagues.map(async (league) => {
        const count = await this.leagueRepository.getMemberCount(league.id);
        memberCountMap.set(league.id, count);
      }),
    );

    // Usuario es miembro de todas estas ligas
    const membershipMap = new Map(leagues.map((l) => [l.id, true]));

    return LeagueResponseDto.fromEntities(
      leagues,
      req.user.id,
      membershipMap,
      memberCountMap,
    );
  }

  /**
   * GET /leagues/:id
   * Obtener una liga por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get league by ID',
    description: 'Retrieve detailed information about a specific league',
  })
  @ApiParam({ name: 'id', description: 'League UUID' })
  @ApiResponse({
    status: 200,
    description: 'League found',
    type: LeagueResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'League not found' })
  async findById(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<LeagueResponseDto> {
    const league = await this.getLeagueByIdUseCase.execute(id);
    const isMember = await this.leagueRepository.isMember(id, req.user.id);
    const memberCount = await this.leagueRepository.getMemberCount(id);

    return LeagueResponseDto.fromEntity(league, req.user.id, isMember, memberCount);
  }

  /**
   * PATCH /leagues/:id
   * Actualizar una liga (solo admin)
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update league (admin only)',
    description:
      'Update league information. Only the admin can perform this action.',
  })
  @ApiParam({ name: 'id', description: 'League UUID' })
  @ApiBody({ type: UpdateLeagueDto })
  @ApiResponse({
    status: 200,
    description: 'League updated successfully',
    type: LeagueResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not league admin' })
  @ApiResponse({ status: 404, description: 'League not found' })
  async update(
    @Param('id') id: string,
    @Body() updateLeagueDto: UpdateLeagueDto,
    @Req() req: RequestWithUser,
  ): Promise<LeagueResponseDto> {
    const league = await this.updateLeagueUseCase.execute(
      id,
      req.user.id,
      updateLeagueDto,
    );

    const isMember = await this.leagueRepository.isMember(id, req.user.id);
    const memberCount = await this.leagueRepository.getMemberCount(id);

    return LeagueResponseDto.fromEntity(league, req.user.id, isMember, memberCount);
  }

  /**
   * DELETE /leagues/:id
   * Eliminar una liga (solo admin)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete league (admin only)',
    description:
      'Permanently delete a league. Only the admin can perform this action. All members and predictions will be deleted.',
  })
  @ApiParam({ name: 'id', description: 'League UUID' })
  @ApiResponse({ status: 204, description: 'League deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not league admin' })
  @ApiResponse({ status: 404, description: 'League not found' })
  async delete(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.deleteLeagueUseCase.execute(id, req.user.id);
  }

  /**
   * POST /leagues/:id/join
   * Unirse a una liga
   */
  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Join a league',
    description:
      'Join a league (public or private). Private leagues require invite code. Requires payment and email verification.',
  })
  @ApiParam({ name: 'id', description: 'League UUID' })
  @ApiBody({ type: JoinLeagueDto })
  @ApiResponse({ status: 200, description: 'Successfully joined league' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid invite code or league full' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Payment or email verification required' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Already a member' })
  async join(
    @Param('id') id: string,
    @Body() joinLeagueDto: JoinLeagueDto,
    @Req() req: RequestWithUser,
  ): Promise<{ message: string }> {
    await this.joinLeagueUseCase.execute({
      leagueId: id,
      userId: req.user.id,
      inviteCode: joinLeagueDto.inviteCode,
    });

    return { message: 'Successfully joined league' };
  }

  /**
   * DELETE /leagues/:id/leave
   * Salir de una liga
   */
  @Delete(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Leave a league',
    description:
      'Leave a league. If admin leaves and there are other members, admin role is transferred to oldest member. If admin is the only member, league is deleted.',
  })
  @ApiParam({ name: 'id', description: 'League UUID' })
  @ApiResponse({ status: 200, description: 'Successfully left league' })
  @ApiResponse({ status: 400, description: 'Bad Request - Not a member' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'League not found' })
  async leave(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<{ message: string }> {
    await this.leaveLeagueUseCase.execute(id, req.user.id);

    return { message: 'Successfully left league' };
  }

  /**
   * GET /leagues/:id/members
   * Listar miembros de una liga
   */
  @Get(':id/members')
  @ApiOperation({
    summary: 'Get league members',
    description: 'Retrieve all members of a league (ordered by join date)',
  })
  @ApiParam({ name: 'id', description: 'League UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of league members',
    type: [UserResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'League not found' })
  async getMembers(@Param('id') id: string): Promise<UserResponseDto[]> {
    const members = await this.getLeagueMembersUseCase.execute(id);

    return UserResponseDto.fromEntities(members);
  }

  /**
   * DELETE /leagues/:id/members/:userId
   * Expulsar un miembro de la liga (solo admin)
   */
  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove member from league (admin only)',
    description:
      'Remove a member from the league. Only the admin can perform this action. Admin cannot remove themselves.',
  })
  @ApiParam({ name: 'id', description: 'League UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID to remove' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Cannot remove admin or user not member' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not league admin' })
  @ApiResponse({ status: 404, description: 'League not found' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: RequestWithUser,
  ): Promise<{ message: string }> {
    await this.removeMemberUseCase.execute(id, req.user.id, userId);

    return { message: 'Member removed successfully' };
  }

  /**
   * PATCH /leagues/:id/transfer-admin
   * Transferir rol de admin (solo admin)
   */
  @Patch(':id/transfer-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transfer admin role (admin only)',
    description:
      'Transfer admin role to another member. Only the current admin can perform this action. New admin must be a league member.',
  })
  @ApiParam({ name: 'id', description: 'League UUID' })
  @ApiBody({ type: TransferAdminDto })
  @ApiResponse({ status: 200, description: 'Admin transferred successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - New admin not a member or same as current' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not league admin' })
  @ApiResponse({ status: 404, description: 'League not found' })
  async transferAdmin(
    @Param('id') id: string,
    @Body() transferAdminDto: TransferAdminDto,
    @Req() req: RequestWithUser,
  ): Promise<{ message: string }> {
    await this.transferAdminUseCase.execute(
      id,
      req.user.id,
      transferAdminDto.newAdminUserId,
    );

    return { message: 'Admin transferred successfully' };
  }
}
