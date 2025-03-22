import LessonHistoryScreen from '../screens/LessonHistoryScreen';
import ConceptCardScreen from '../screens/ConceptCardScreen';

<Stack.Navigator>
  {/* ... other screens ... */}
  <Stack.Screen 
    name="LessonHistory" 
    component={LessonHistoryScreen} 
    options={{ headerShown: false }}
  />
  <Stack.Screen 
    name="ConceptCardScreen" 
    component={ConceptCardScreen} 
    options={{ headerShown: false }}
  />
  {/* ... other screens ... */}
</Stack.Navigator> 