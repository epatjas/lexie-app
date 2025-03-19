import LessonHistoryScreen from '../screens/LessonHistoryScreen';

<Stack.Navigator>
  {/* ... other screens ... */}
  <Stack.Screen 
    name="LessonHistory" 
    component={LessonHistoryScreen} 
    options={{ headerShown: false }}
  />
  {/* ... other screens ... */}
</Stack.Navigator> 