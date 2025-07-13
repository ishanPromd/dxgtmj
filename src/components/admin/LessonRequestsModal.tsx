import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, XCircle, Clock, User, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface LessonRequest {
  id: string;
  user_id: string;
  lesson_id: string;
  subject_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  admin_notes?: string;
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  user_name?: string;
  user_email?: string;
  lesson_title?: string;
  subject_name?: string;
}

interface LessonRequestsModalProps {
  onClose: () => void;
}

export const LessonRequestsModal: React.FC<LessonRequestsModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LessonRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('lesson_requests')
        .select(`
          *,
          requester:users!lesson_requests_user_id_fkey(name, email),
          subject_lessons(title),
          subjects(name)
        `)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Error loading requests:', error);
        toast.error('Failed to load lesson requests');
        return;
      }

      const formattedRequests = data?.map(request => ({
        id: request.id,
        user_id: request.user_id,
        lesson_id: request.lesson_id,
        subject_id: request.subject_id,
        status: request.status,
        message: request.message,
        admin_notes: request.admin_notes,
        requested_at: request.requested_at,
        reviewed_at: request.reviewed_at,
        reviewed_by: request.reviewed_by,
        user_name: request.requester?.name,
        user_email: request.requester?.email,
        lesson_title: request.subject_lessons?.title,
        subject_name: request.subjects?.name,
      })) || [];

      setRequests(formattedRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load lesson requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (request: LessonRequest) => {
    if (!user?.id) return;

    setProcessingRequests(prev => new Set(prev).add(request.id));

    try {
      // Check if user already has access to this lesson
      const { data: existingAccess, error: checkError } = await supabase
        .from('user_lesson_access')
        .select('id')
        .eq('user_id', request.user_id)
        .eq('lesson_id', request.lesson_id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing access:', checkError);
        toast.error('Failed to check existing access');
        return;
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('lesson_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', request.id);

      if (updateError) {
        console.error('Error updating request:', updateError);
        toast.error('Failed to approve request');
        return;
      }

      // Grant access to the lesson only if user doesn't already have access
      if (!existingAccess) {
        const { error: accessError } = await supabase
          .from('user_lesson_access')
          .insert({
            user_id: request.user_id,
            lesson_id: request.lesson_id,
            subject_id: request.subject_id,
            granted_by: user.id
          });

        if (accessError) {
          console.error('Error granting access:', accessError);
          toast.error('Failed to grant lesson access');
          return;
        }
      }

      toast.success('Request approved and access granted!');
      await loadRequests(); // Reload to show updated status
      
      // Send notification to user about approved request
      try {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: request.user_id,
            type: 'broadcast',
            title: 'Lesson Access Approved! 🎉',
            message: `Your request for "${request.lesson_title}" has been approved. You can now access this premium lesson content.`,
            priority: 'high',
            data: { 
              icon: 'check-circle',
              lesson_id: request.lesson_id,
              lesson_title: request.lesson_title 
            },
            read_status: false
          });

        if (notificationError) {
          console.error('Error sending notification:', notificationError);
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
      }
      
      // Notify other components that lesson access has been updated
      window.dispatchEvent(new CustomEvent('lessonAccessUpdated', {
        detail: { userId: request.user_id, lessonId: request.lesson_id }
      }));
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(request.id);
        return newSet;
      });
    }
  };

  const handleRejectRequest = async (request: LessonRequest) => {
    if (!user?.id) return;

    setProcessingRequests(prev => new Set(prev).add(request.id));

    try {
      const { error } = await supabase
        .from('lesson_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', request.id);

      if (error) {
        console.error('Error rejecting request:', error);
        toast.error('Failed to reject request');
        return;
      }

      toast.success('Request rejected');
      await loadRequests(); // Reload to show updated status
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(request.id);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" size="sm"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="success" size="sm"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="error" size="sm"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="gray" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Lesson Access Requests</h2>
                <p className="text-sm text-gray-600">Manage user requests for lesson access</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Requests</h3>
              <p className="text-gray-600">No lesson access requests have been submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{request.user_name}</h4>
                          <p className="text-sm text-gray-600">{request.user_email}</p>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Lesson:</span> {request.lesson_title}
                        </p>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Subject:</span> {request.subject_name}
                        </p>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Requested:</span> {new Date(request.requested_at).toLocaleDateString()}
                        </p>
                      </div>

                      {request.message && (
                        <div className="mb-3 p-3 bg-white rounded border border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-1">Message:</p>
                          <p className="text-sm text-gray-600">{request.message}</p>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        {getStatusBadge(request.status)}
                        {request.reviewed_at && (
                          <span className="text-xs text-gray-500">
                            Reviewed on {new Date(request.reviewed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex space-x-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleApproveRequest(request)}
                          loading={processingRequests.has(request.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectRequest(request)}
                          loading={processingRequests.has(request.id)}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};