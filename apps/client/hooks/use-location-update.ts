// hooks/useLocationUpdate.ts
import { useEffect } from 'react';
import { authClient } from '@/lib/auth';
import { toast } from 'sonner';

interface LocationData {
  province: string;
  district: string;
  hospital: string;
  userId: string;
}

export const useLocationUpdate = () => {
  useEffect(() => {
    const updateLocationData = async () => {
      // Get the current session
      const session = await authClient.getSession();
      
      if (session.data?.user) {
        // Check if there's pending location data
        const pendingData = localStorage.getItem('pendingLocationData');
        
        if (pendingData) {
          try {
            const locationData: LocationData = JSON.parse(pendingData);
            
            // Verify the user ID matches
            if (locationData.userId === session.data.user.id) {
              // Here you would typically make an API call to update the user's profile
              // with the location data. For now, we'll simulate this:
              
              // Example API call (you'll need to implement this endpoint):
              // await fetch('/api/user/update-location', {
              //   method: 'POST',
              //   headers: { 'Content-Type': 'application/json' },
              //   body: JSON.stringify({
              //     province: locationData.province,
              //     district: locationData.district,
              //     hospital: locationData.hospital,
              //   }),
              // });
              
              // For now, just log the data and show success
              console.log('Location data to update:', locationData);
              toast.success('Profile setup completed successfully!');
              
              // Clear the pending data
              localStorage.removeItem('pendingLocationData');
            }
          } catch (error) {
            console.error('Error updating location data:', error);
            // Don't show error to user as this is background operation
          }
        }
      }
    };

    updateLocationData();
  }, []);
};

// Usage in your dashboard or main app component:
// export default function Dashboard() {
//   useLocationUpdate(); // This will handle the location update after email verification
//   
//   return (
//     // Your dashboard content
//   );
// }