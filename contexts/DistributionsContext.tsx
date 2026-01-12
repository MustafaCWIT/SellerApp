import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Distribution, UserDistribution } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface DistributionsContextType {
    distributions: Distribution[];
    userDistributions: UserDistribution[];
    selectedDistribution: Distribution | null;
    loading: boolean;
    selectDistribution: (distribution: Distribution) => void;
    refreshDistributions: () => Promise<void>;
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
}

const DistributionsContext = createContext<DistributionsContextType | undefined>(undefined);

export const DistributionsProvider = ({ children }: { children: ReactNode }) => {
    const [distributions, setDistributions] = useState<Distribution[]>([]);
    const [userDistributions, setUserDistributions] = useState<UserDistribution[]>([]);
    const [selectedDistribution, setSelectedDistribution] = useState<Distribution | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const { userId, isAdmin } = useAuth();

    // Fetch all distributions and user's default from Supabase
    const fetchUserDistributions = async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // Fetch ALL active distributions
            const { data: allDistData, error: distError } = await supabase
                .from('distributions')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (distError) {
                throw distError;
            }

            // Fetch user's distribution assignments
            const { data: userDistData, error: userDistError } = await supabase
                .from('user_distributions')
                .select(`
                    id,
                    user_id,
                    distribution_id
                `)
                .eq('user_id', userId);

            if (userDistError) {

            }

            if (allDistData) {
                // Map all distributions
                const allDistributions: Distribution[] = allDistData.map((dist: any) => ({
                    id: dist.id,
                    name: dist.name,
                    code: dist.code,
                    description: dist.description,
                    isActive: dist.is_active,
                    distId: dist.dist_id,
                    clientName: dist.client_name,
                    clientCode: dist.client_code,
                }));

                // Map user distributions
                const mappedUserDistributions: UserDistribution[] = (userDistData || []).map((ud: any) => ({
                    id: ud.id,
                    userId: ud.user_id,
                    distributionId: ud.distribution_id,
                }));

                setUserDistributions(mappedUserDistributions);

                // Filter distributions for non-admins to only show assigned ones
                const finalDistributions = isAdmin
                    ? allDistributions
                    : allDistributions.filter(d =>
                        mappedUserDistributions.some(ud => ud.distributionId === d.id)
                    );

                setDistributions(finalDistributions);

                // Auto-select logic
                if (finalDistributions.length > 0) {
                    // 1. If we already have a selection and it's still in the list, keep it
                    if (selectedDistribution && finalDistributions.some(d => d.id === selectedDistribution.id)) {
                        // Keep current selection
                    }
                    // 2. Otherwise, if the user has assigned distributions, pick the first assigned one
                    else if (mappedUserDistributions.length > 0) {
                        const firstAssigned = finalDistributions.find(d =>
                            mappedUserDistributions.some(ud => ud.distributionId === d.id)
                        );
                        if (firstAssigned) {
                            setSelectedDistribution(firstAssigned);
                        } else {
                            // This case shouldn't happen if finalDistributions is filtered correctly
                            setSelectedDistribution(finalDistributions[0]);
                        }
                    }
                    // 3. Fallback for admins or users with no assignments (if any were found)
                    else if (isAdmin) {
                        setSelectedDistribution(finalDistributions[0]);
                    }
                } else {
                    setSelectedDistribution(null);
                }
            }
        } catch (error) {

        } finally {
            setLoading(false);
        }
    };

    // Fetch distributions on mount and when userId or isAdmin changes
    useEffect(() => {
        fetchUserDistributions();
    }, [userId, isAdmin]);

    const selectDistribution = (distribution: Distribution) => {
        setSelectedDistribution(distribution);
    };

    const refreshDistributions = async () => {
        await fetchUserDistributions();
    };

    return (
        <DistributionsContext.Provider
            value={{
                distributions,
                userDistributions,
                selectedDistribution,
                loading,
                selectDistribution,
                refreshDistributions,
                selectedDate,
                setSelectedDate,
            }}
        >
            {children}
        </DistributionsContext.Provider>
    );
};

export const useDistributions = () => {
    const context = useContext(DistributionsContext);
    if (context === undefined) {
        throw new Error('useDistributions must be used within a DistributionsProvider');
    }
    return context;
};
