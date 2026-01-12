import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  Send, 
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Loader2
} from 'lucide-react';

interface EnhancedFormActionsProps {
  onSaveDraft: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  isDirty?: boolean;
  isValid?: boolean;
  validationErrors?: Record<string, any>;
  lastSaved?: Date;
  mode?: 'create' | 'edit';
}

export const EnhancedFormActions: React.FC<EnhancedFormActionsProps> = ({
  onSaveDraft,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isDirty = false,
  isValid = true,
  validationErrors = {},
  lastSaved,
  mode = 'create'
}) => {
  const errorCount = Object.keys(validationErrors).length;
  
  // Determine button text based on mode and submission state
  const getButtonText = () => {
    if (isSubmitting) {
      return mode === 'create' ? 'Creating...' : 'Updating...';
    }
    return mode === 'create' ? 'Create Planning' : 'Update Planning';
  };
  
  return (
    <Card className="sticky bottom-0 z-10 shadow-lg border-t-2 border-2 border-black rounded-none mt-4">
      <CardContent>
        <div className="flex justify-between items-center">
          {/* Status Information */}
          <div className="flex items-center gap-4 text-sm">
            {/* Validation Status */}
            <div className="flex items-center gap-2">
              {isValid ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span>Valid</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            <Separator orientation="vertical" className="h-4" />

            {/* Dirty Status */}
            {isDirty && (
              <div className="flex items-center text-amber-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>Unsaved changes</span>
              </div>
            )}

            {/* Last Saved */}
            {lastSaved && (
              <div className="flex items-center text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={onSaveDraft}
              disabled={isSubmitting || !isDirty}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            
            <Button 
              type="submit" 
              onClick={() => {
                console.log('🔘 Submit button clicked!', { isSubmitting, isValid });
                onSubmit();
              }}
              disabled={isSubmitting || !isValid}
              className="flex items-center gap-2 min-w-[160px]"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {getButtonText()}
            </Button>
          </div>
        </div>

        {/* Error Details */}
        {!isValid && errorCount > 0 && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-800">
              <p className="font-semibold mb-2">Please fix the following issues:</p>
              <ul className="list-disc list-inside space-y-1 max-h-20 overflow-y-auto">
                {Object.entries(validationErrors).slice(0, 5).map(([field, errors]) => (
                  <li key={field}>
                    <span className="font-medium">{field}:</span>{' '}
                    {Array.isArray(errors) ? errors.join(', ') : errors}
                  </li>
                ))}
                {errorCount > 5 && (
                  <li className="text-gray-600">
                    ... and {errorCount - 5} more error{errorCount - 5 !== 1 ? 's' : ''}
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};