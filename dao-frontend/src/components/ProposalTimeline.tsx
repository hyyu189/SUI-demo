import React, { useState, useEffect } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { 
  Clock, 
  Vote, 
  CheckCircle, 
  XCircle, 
  ArrowUpRight, 
  DollarSign, 
  Users, 
  Calendar,
  TrendingUp,
  FileText,
  Activity
} from 'lucide-react';
import { 
  formatSUI, 
  formatAddress, 
  getProposalStatusText, 
  getProposalStatusColor,
  findTreasuryEvents,
  PACKAGE_ID 
} from '../utils/suiUtils';

interface TimelineEvent {
  id: string;
  type: 'proposal_created' | 'vote_cast' | 'proposal_executed' | 'funds_deposited' | 'member_added';
  timestamp: number;
  proposalId?: number;
  title?: string;
  amount?: string;
  address?: string;
  vote?: boolean;
  data: any;
}

interface ProposalTimelineProps {
  treasuryId: string;
  proposals: any[];
}

const ProposalTimeline: React.FC<ProposalTimelineProps> = ({ treasuryId, proposals }) => {
  const suiClient = useSuiClient();
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Load timeline events from contract events and proposals
  const loadTimelineEvents = async () => {
    setLoading(true);
    try {
      const events: TimelineEvent[] = [];

      // Add proposal events from current proposal data
      proposals.forEach((proposal, index) => {
        // Proposal created event
        events.push({
          id: `proposal-${proposal.id}-created`,
          type: 'proposal_created',
          timestamp: parseInt(proposal.createdAt) || Date.now() - (86400000 * (proposals.length - index)),
          proposalId: proposal.id,
          title: proposal.title,
          amount: proposal.amount,
          address: proposal.proposer,
          data: proposal
        });

        // Mock vote events (in real app, these would come from blockchain events)
        const yesVotes = parseInt(proposal.yesVotes) || 0;
        const noVotes = parseInt(proposal.noVotes) || 0;
        
        for (let i = 0; i < yesVotes; i++) {
          events.push({
            id: `proposal-${proposal.id}-vote-yes-${i}`,
            type: 'vote_cast',
            timestamp: parseInt(proposal.createdAt) + (i + 1) * 3600000, // 1 hour intervals
            proposalId: proposal.id,
            title: proposal.title,
            vote: true,
            address: `0x${Math.random().toString(16).substr(2, 40)}`, // Mock voter address
            data: { proposalId: proposal.id, vote: true }
          });
        }

        for (let i = 0; i < noVotes; i++) {
          events.push({
            id: `proposal-${proposal.id}-vote-no-${i}`,
            type: 'vote_cast',
            timestamp: parseInt(proposal.createdAt) + (yesVotes + i + 1) * 3600000,
            proposalId: proposal.id,
            title: proposal.title,
            vote: false,
            address: `0x${Math.random().toString(16).substr(2, 40)}`, // Mock voter address
            data: { proposalId: proposal.id, vote: false }
          });
        }

        // Execution event if proposal was executed
        if (proposal.status === 3) { // Executed
          events.push({
            id: `proposal-${proposal.id}-executed`,
            type: 'proposal_executed',
            timestamp: parseInt(proposal.createdAt) + (yesVotes + noVotes + 1) * 3600000,
            proposalId: proposal.id,
            title: proposal.title,
            amount: proposal.amount,
            address: proposal.recipient,
            data: proposal
          });
        }
      });

      // Add mock treasury events for demo purposes
      const mockEvents: TimelineEvent[] = [
        {
          id: 'treasury-created',
          type: 'member_added',
          timestamp: Date.now() - (7 * 86400000), // 7 days ago
          title: 'Treasury Created',
          address: '0xf1a6cc3e4ae2609dbd6fd79499803ad59322d114be93111d8f46c8a47b988d92',
          data: { isCreation: true }
        },
        {
          id: 'initial-deposit',
          type: 'funds_deposited',
          timestamp: Date.now() - (6 * 86400000), // 6 days ago
          title: 'Initial Funding',
          amount: '5000000000000', // 5000 SUI
          address: '0xf1a6cc3e4ae2609dbd6fd79499803ad59322d114be93111d8f46c8a47b988d92',
          data: { amount: '5000000000000' }
        },
        {
          id: 'member-added-1',
          type: 'member_added',
          timestamp: Date.now() - (5 * 86400000), // 5 days ago
          title: 'Member Added',
          address: '0x1234567890abcdef1234567890abcdef12345678',
          data: { member: '0x1234567890abcdef1234567890abcdef12345678' }
        },
        {
          id: 'member-added-2',
          type: 'member_added',
          timestamp: Date.now() - (4 * 86400000), // 4 days ago
          title: 'Member Added',
          address: '0xabcdef1234567890abcdef1234567890abcdef12',
          data: { member: '0xabcdef1234567890abcdef1234567890abcdef12' }
        }
      ];

      events.push(...mockEvents);

      // Sort events by timestamp (newest first)
      const sortedEvents = events.sort((a, b) => b.timestamp - a.timestamp);
      setTimelineEvents(sortedEvents);

    } catch (error) {
      console.error('Error loading timeline events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimelineEvents();
  }, [proposals, treasuryId]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'proposal_created':
        return <FileText className="h-4 w-4" />;
      case 'vote_cast':
        return <Vote className="h-4 w-4" />;
      case 'proposal_executed':
        return <ArrowUpRight className="h-4 w-4" />;
      case 'funds_deposited':
        return <DollarSign className="h-4 w-4" />;
      case 'member_added':
        return <Users className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'proposal_created':
        return 'bg-blue-500';
      case 'vote_cast':
        return 'bg-purple-500';
      case 'proposal_executed':
        return 'bg-green-500';
      case 'funds_deposited':
        return 'bg-emerald-500';
      case 'member_added':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEventTitle = (event: TimelineEvent) => {
    switch (event.type) {
      case 'proposal_created':
        return `New Proposal: ${event.title}`;
      case 'vote_cast':
        return `Vote ${event.vote ? 'YES' : 'NO'} on "${event.title}"`;
      case 'proposal_executed':
        return `Executed: ${event.title}`;
      case 'funds_deposited':
        return event.data.isCreation ? 'Treasury Created' : 'Funds Deposited';
      case 'member_added':
        return event.data.isCreation ? 'DAO Treasury Created' : 'New Member Added';
      default:
        return 'Unknown Event';
    }
  };

  const getEventDescription = (event: TimelineEvent) => {
    switch (event.type) {
      case 'proposal_created':
        return `Proposal for ${formatSUI(event.amount || '0')} SUI to ${formatAddress(event.address || '')}`;
      case 'vote_cast':
        return `${formatAddress(event.address || '')} voted ${event.vote ? 'YES' : 'NO'}`;
      case 'proposal_executed':
        return `${formatSUI(event.amount || '0')} SUI sent to ${formatAddress(event.address || '')}`;
      case 'funds_deposited':
        return `${formatSUI(event.amount || '0')} SUI deposited by ${formatAddress(event.address || '')}`;
      case 'member_added':
        return event.data.isCreation ? 'DAO treasury initialized' : `${formatAddress(event.address || '')} joined the DAO`;
      default:
        return 'Event occurred';
    }
  };

  const filteredEvents = timelineEvents.filter(event => {
    if (filter === 'all') return true;
    return event.type === filter;
  });

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Activity Timeline</h2>
          <p className="text-gray-600">Chronological history of all DAO activities</p>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
          >
            <option value="all">All Events</option>
            <option value="proposal_created">Proposals</option>
            <option value="vote_cast">Votes</option>
            <option value="proposal_executed">Executions</option>
            <option value="funds_deposited">Deposits</option>
            <option value="member_added">Members</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {timelineEvents.filter(e => e.type === 'proposal_created').length}
          </div>
          <div className="text-sm text-gray-500">Proposals</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {timelineEvents.filter(e => e.type === 'vote_cast').length}
          </div>
          <div className="text-sm text-gray-500">Votes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {timelineEvents.filter(e => e.type === 'proposal_executed').length}
          </div>
          <div className="text-sm text-gray-500">Executed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {timelineEvents.filter(e => e.type === 'funds_deposited').length}
          </div>
          <div className="text-sm text-gray-500">Deposits</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {timelineEvents.filter(e => e.type === 'member_added').length}
          </div>
          <div className="text-sm text-gray-500">Members</div>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading timeline...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No events found for the selected filter</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {filteredEvents.map((event, index) => (
            <div key={event.id} className="flex items-start space-x-3">
              {/* Timeline dot */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getEventColor(event.type)} flex items-center justify-center text-white`}>
                {getEventIcon(event.type)}
              </div>

              {/* Event content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">
                    {getEventTitle(event)}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(event.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {getEventDescription(event)}
                </p>
                {event.proposalId !== undefined && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                    Proposal #{event.proposalId}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activity Trends */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <TrendingUp className="h-4 w-4" />
          <span>
            {filteredEvents.length > 0 ? 
              `${filteredEvents.length} events in the selected view` : 
              'No recent activity'
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProposalTimeline;