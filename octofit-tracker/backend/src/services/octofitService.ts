import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null) {
    throw Object.assign(new Error('Activity input must be an object'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  const isObjectId = (value: unknown): value is string =>
    typeof value === 'string' && /^[\da-f]{24}$/i.test(value);

  if (!isObjectId(userId) || !isObjectId(teamId) || typeof type !== 'string' || !type.trim() ||
      typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw Object.assign(new Error('Activity input is invalid'), { status: 400 });
  }

  const [user, team] = await Promise.all([
    User.findById(userId).select('_id'),
    Team.findById(teamId).select('_id'),
  ]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 404 });
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null) {
    throw Object.assign(new Error('Team input must be an object'), { status: 400 });
  }

  const { name, mascot, members } = input as Record<string, unknown>;
  const isObjectId = (value: unknown): value is string =>
    typeof value === 'string' && /^[\da-f]{24}$/i.test(value);

  if (typeof name !== 'string' || !name.trim() || typeof mascot !== 'string' || !mascot.trim()) {
    throw Object.assign(new Error('Team name and mascot are required'), { status: 400 });
  }
  if (members !== undefined && (!Array.isArray(members) || !members.every(isObjectId))) {
    throw Object.assign(new Error('Team members must be valid IDs'), { status: 400 });
  }

  return Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: members ?? [],
  });
}

export async function getLeaderboard() {
  const teams = await Team.aggregate([
    {
      $lookup: {
        from: Activity.collection.name,
        localField: '_id',
        foreignField: 'team',
        as: 'activities',
      },
    },
    {
      $set: {
        totalPoints: {
          $reduce: {
            input: '$activities',
            initialValue: 0,
            in: { $add: ['$$value', { $ifNull: ['$$this.points', 0] }] },
          },
        },
      },
    },
    { $project: { _id: 0, teamName: '$name', totalPoints: 1 } },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);

  return teams.map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User was not found'), { status: 404 });
  }

  const [activities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(10).lean(),
    Workout.find().lean(),
  ]);

  const focusForActivity: Record<string, string> = {
    run: 'endurance',
    running: 'endurance',
    cycle: 'endurance',
    cycling: 'endurance',
    walk: 'endurance',
    walking: 'endurance',
    swim: 'endurance',
    swimming: 'endurance',
    strength: 'strength',
    weights: 'strength',
  };
  const recentActivity = activities[0];
  const activityFocus = recentActivity
    ? focusForActivity[recentActivity.type.toLowerCase()] ?? recentActivity.type.toLowerCase()
    : undefined;
  const normalizeFocus = (focus: string | undefined) => focus?.trim().toLowerCase();
  const goalFocus = normalizeFocus(user.fitnessGoal);
  const preferredFocus = workouts.some((workout) => normalizeFocus(workout.focus) === goalFocus)
    ? goalFocus
    : workouts.some((workout) => normalizeFocus(workout.focus) === activityFocus)
      ? activityFocus
      : undefined;

  return workouts
    .sort((first, second) => Number(normalizeFocus(second.focus) === preferredFocus) - Number(normalizeFocus(first.focus) === preferredFocus))
    .map((workout) => ({
      ...workout,
      reason: normalizeFocus(workout.focus) === goalFocus
        ? `Recommended for your ${user.fitnessGoal} goal.`
        : recentActivity
          ? `Recommended based on your recent ${recentActivity.type} activity.`
          : 'Recommended based on your fitness profile.',
    }));
}

export { User };
