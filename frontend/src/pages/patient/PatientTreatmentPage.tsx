import { useEffect, useState } from 'react';
import { ClipboardList, CheckCircle, Target } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { TreatmentPlan } from '../../types';
import { Card, Badge, LoadingPage, EmptyState } from '../../components/ui';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

export default function PatientTreatmentPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.profileId) return;
    apiGet<TreatmentPlan[]>(`/treatments/patient/${user.profileId}`)
      .then(setPlans).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <LoadingPage />;

  const STATUS_BADGE: Record<string, 'success' | 'gray' | 'warning'> = { active: 'success', completed: 'gray', discontinued: 'warning' };

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Treatment Plan</h1>
        <p className="text-sm text-gray-500">Recovery roadmap provided by your healthcare provider</p>
      </div>
      {!plans.length ? (
        <EmptyState icon={<ClipboardList size={40} />} title="No treatment plan assigned" description="Your doctor will create your treatment plan soon." />
      ) : (
        plans.map(plan => {
          const achieved = plan.treatmentGoals.filter(g => g.treatmentGoalStatus === 'achieved').length;
          const progress = plan.treatmentGoals.length ? Math.round((achieved / plan.treatmentGoals.length) * 100) : 0;
          return (
            <Card key={plan.treatmentPlanId} className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-bold text-gray-900 text-base">{plan.treatmentPlanTitle}</h2>
                    <Badge variant={STATUS_BADGE[plan.treatmentPlanStatus]}>{plan.treatmentPlanStatus}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    Dr. {plan.doctor?.docFirstName} {plan.doctor?.docLastName} · {plan.doctor?.docSpecialization}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <p>Start: {formatDate(plan.treatmentPlanStartDate)}</p>
                  {plan.treatmentPlanEndDate && <p>End: {formatDate(plan.treatmentPlanEndDate)}</p>}
                </div>
              </div>

              {plan.treatmentPlanDescription && (
                <p className="text-sm text-gray-600">{plan.treatmentPlanDescription}</p>
              )}

              {/* Progress bar */}
              {plan.treatmentGoals.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 flex items-center gap-1"><Target size={12} /> Goals Progress</span>
                    <span className="font-semibold text-gray-700">{achieved}/{plan.treatmentGoals.length} achieved ({progress}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {/* Goals list */}
              {plan.treatmentGoals.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Treatment Goals</p>
                  {plan.treatmentGoals.map(g => (
                    <div key={g.treatmentGoalId} className={cn('flex items-start gap-3 p-3 rounded-lg', g.treatmentGoalStatus === 'achieved' ? 'bg-green-50' : 'bg-gray-50')}>
                      {g.treatmentGoalStatus === 'achieved'
                        ? <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                        : <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1">
                        <p className={cn('text-sm', g.treatmentGoalStatus === 'achieved' ? 'line-through text-gray-400' : 'text-gray-800')}>
                          {g.treatmentGoalDescription}
                        </p>
                        {g.treatmentGoalTargetDate && (
                          <p className="text-xs text-gray-400 mt-0.5">Target: {formatDate(g.treatmentGoalTargetDate)}</p>
                        )}
                      </div>
                      <Badge variant={g.treatmentGoalStatus === 'achieved' ? 'success' : g.treatmentGoalStatus === 'missed' ? 'danger' : 'gray'}>
                        {g.treatmentGoalStatus}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
