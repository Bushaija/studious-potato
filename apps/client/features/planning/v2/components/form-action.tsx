import { Card, CardContent } from '@/components/ui/card';
import { Save, Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Component: Form Actions
interface FormActionsProps {
  onSaveDraft: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  isDirty?: boolean;
}

export const FormActions: React.FC<FormActionsProps> = ({
  onSaveDraft,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isDirty = false
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {isDirty && (
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span>Unsaved changes</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
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
              onClick={onSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Submitting...' : 'Submit Plan'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

