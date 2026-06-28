import Complaint from '../models/Complaint.js';
import { validateCoordinates } from '../utils/geoValidation.js';

const DEFAULT_RADIUS_METERS = 5000;
const DEFAULT_ANALYTICS_DAYS = 30;
const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const STATUSES = ['Submitted', 'In Review', 'Assigned', 'In Progress', 'Resolved', 'Reopened', 'Rejected'];
const OPEN_STATUSES = ['Submitted', 'In Review', 'Assigned', 'In Progress', 'Reopened'];
const CATEGORIES = ['Roads', 'Electrical', 'Sanitation', 'Water', 'General', 'Pending_AI_Review'];
const SEVERITIES = [5, 4, 3, 2, 1];

const getQueryCoordinate = (query, primaryKey, aliasKey) => {
  return query[primaryKey] ?? query[aliasKey];
};

const validateDistance = (distance) => {
  if (distance === undefined || distance === null || distance === '') {
    return { value: DEFAULT_RADIUS_METERS };
  }

  const parsedDistance = Number(distance);
  if (!Number.isFinite(parsedDistance) || parsedDistance <= 0) {
    return { error: 'Distance must be a positive number of meters.' };
  }

  return { value: parsedDistance };
};

const parseDateBoundary = (value, boundary) => {
  if (!value) return null;

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return { error: `${boundary} must be a valid date.` };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (boundary === 'to') {
      parsedDate.setHours(23, 59, 59, 999);
    } else {
      parsedDate.setHours(0, 0, 0, 0);
    }
  }

  return { value: parsedDate };
};

const getDateRange = (query) => {
  const now = new Date();
  const fromInput = parseDateBoundary(query.from, 'from');
  if (fromInput?.error) return { error: fromInput.error };

  const toInput = parseDateBoundary(query.to, 'to');
  if (toInput?.error) return { error: toInput.error };

  const to = toInput?.value || now;
  const from = fromInput?.value || new Date(to.getTime() - DEFAULT_ANALYTICS_DAYS * 24 * MS_PER_HOUR);

  if (from > to) {
    return { error: 'from must be earlier than or equal to to.' };
  }

  return { from, to };
};

const formatFixedBuckets = (dataArray, buckets, transformName = (value) => value) => {
  const counts = new Map(dataArray.map((item) => [String(item._id), item.count]));
  return buckets.map((bucket) => ({
    name: transformName(bucket),
    value: counts.get(String(bucket)) || 0
  }));
};

const getDayKey = (date) => date.toISOString().slice(0, 10);

const getUtcDayStart = (date) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const formatTrendData = (dataArray, from, to) => {
  const counts = new Map(dataArray.map((item) => [String(item._id), item.count]));
  const days = [];
  const cursor = getUtcDayStart(from);
  const end = getUtcDayStart(to);

  while (cursor <= end) {
    const key = getDayKey(cursor);
    days.push({
      name: key,
      value: counts.get(key) || 0
    });
    cursor.setTime(cursor.getTime() + MS_PER_DAY);
  }

  return days;
};

const roundPercent = (value) => {
  return Math.round(value * 100) / 100;
};

// @desc    Get dashboard analytics dynamically scoped by role
// @route   GET /api/analytics
// @access  Private (Citizen, DepartmentAdmin, SuperAdmin)
export const getDashboardAnalytics = async (req, res) => {
  try {
    const pipeline = [];
    const scope = {
      role: req.user.role
    };

    if (req.user.role === 'DepartmentAdmin' && req.user.isApproved !== true) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Your account is pending SuperAdmin approval.'
      });
    }

    if (req.user.role === 'Citizen') {
      const longitude = getQueryCoordinate(req.query, 'longitude', 'lng');
      const latitude = getQueryCoordinate(req.query, 'latitude', 'lat');
      const coordinateValidation = validateCoordinates({ longitude, latitude });

      if (coordinateValidation.error) {
        return res.status(400).json({
          success: false,
          message: coordinateValidation.error,
          bounds: coordinateValidation.bounds
        });
      }

      const distanceValidation = validateDistance(req.query.distance);
      if (distanceValidation.error) {
        return res.status(400).json({
          success: false,
          message: distanceValidation.error
        });
      }

      scope.type = 'local';
      scope.longitude = coordinateValidation.longitude;
      scope.latitude = coordinateValidation.latitude;
      scope.distanceMeters = distanceValidation.value;

      // $geoNear must stay first in the aggregation pipeline.
      pipeline.push({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [coordinateValidation.longitude, coordinateValidation.latitude]
          },
          distanceField: 'distance',
          maxDistance: distanceValidation.value,
          spherical: true
        }
      });
    } else if (req.user.role === 'DepartmentAdmin') {
      scope.type = 'department';
      scope.department = req.user.departmentAssigned;
    } else {
      scope.type = 'global';
    }

    const dateRange = getDateRange(req.query);
    if (dateRange.error) {
      return res.status(400).json({
        success: false,
        message: dateRange.error
      });
    }

    scope.dateRange = {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString()
    };

    const matchStage = {
      createdAt: {
        $gte: dateRange.from,
        $lte: dateRange.to
      }
    };

    if (req.user.role === 'DepartmentAdmin') {
      matchStage.category = req.user.departmentAssigned;
    }

    pipeline.push({ $match: matchStage });

    pipeline.push({
      $facet: {
        totalOverview: [
          { $count: 'total' }
        ],
        statusBreakdown: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        categoryBreakdown: [
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ],
        severityBreakdown: [
          { $group: { _id: '$severityRating', count: { $sum: 1 } } }
        ],
        openCount: [
          { $match: { status: { $in: OPEN_STATUSES } } },
          { $count: 'total' }
        ],
        resolvedCount: [
          { $match: { status: 'Resolved' } },
          { $count: 'total' }
        ],
        rejectedCount: [
          { $match: { status: 'Rejected' } },
          { $count: 'total' }
        ],
        highPriorityCount: [
          {
            $match: {
              $or: [
                { severityRating: { $gte: 4 } },
                { isEscalated: true }
              ]
            }
          },
          { $count: 'total' }
        ],
        escalatedCount: [
          { $match: { isEscalated: true } },
          { $count: 'total' }
        ],
        resolutionStats: [
          { $match: { status: 'Resolved' } },
          {
            $project: {
              resolvedEvent: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: '$timeline',
                      as: 'event',
                      cond: { $eq: ['$$event.status', 'Resolved'] }
                    }
                  },
                  -1
                ]
              },
              createdAt: 1,
              updatedAt: 1
            }
          },
          {
            $project: {
              resolutionHours: {
                $divide: [
                  {
                    $subtract: [
                      { $ifNull: ['$resolvedEvent.updatedAt', '$updatedAt'] },
                      '$createdAt'
                    ]
                  },
                  MS_PER_HOUR
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              averageResolutionHours: { $avg: '$resolutionHours' }
            }
          }
        ],
        trendByDay: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]
      }
    });

    const aggregationResult = await Complaint.aggregate(pipeline);
    const rawData = aggregationResult[0] || {};

    const total = rawData.totalOverview?.[0]?.total || 0;
    const open = rawData.openCount?.[0]?.total || 0;
    const resolved = rawData.resolvedCount?.[0]?.total || 0;
    const rejected = rawData.rejectedCount?.[0]?.total || 0;
    const highPriority = rawData.highPriorityCount?.[0]?.total || 0;
    const escalated = rawData.escalatedCount?.[0]?.total || 0;
    const averageResolutionHours = rawData.resolutionStats?.[0]?.averageResolutionHours || 0;

    res.set('Cache-Control', 'private, max-age=30');
    res.status(200).json({
      success: true,
      scope,
      data: {
        overview: {
          total,
          open,
          resolved,
          rejected,
          highPriority,
          escalated,
          resolutionRate: total > 0 ? roundPercent((resolved / total) * 100) : 0,
          averageResolutionHours: roundPercent(averageResolutionHours)
        },
        byStatus: formatFixedBuckets(rawData.statusBreakdown || [], STATUSES),
        byCategory: formatFixedBuckets(rawData.categoryBreakdown || [], CATEGORIES),
        bySeverity: formatFixedBuckets(
          rawData.severityBreakdown || [],
          SEVERITIES,
          (severity) => `Severity ${severity}`
        ),
        trendByDay: formatTrendData(rawData.trendByDay || [], dateRange.from, dateRange.to)
      }
    });
  } catch (error) {
    console.error('❌ Analytics Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
