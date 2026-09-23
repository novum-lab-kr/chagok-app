import React,{useState} from 'react';
import { View,ScrollView } from 'react-native';
import type { Meta,StoryObj } from '@storybook/react-vite';
import { GoalChip,PixelButton,ProgressBar } from '../src/design-system';
const meta={title:'Components/Goal chip',component:GoalChip,args:{label:'책 읽기',value:6,total:15,selected:true},decorators:[Story=><View style={{maxWidth:380}}><Story/></View>]} satisfies Meta<typeof GoalChip>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Selected:Story={};
export const Unselected:Story={args:{label:'산책',selected:false,value:7,total:30}};
export const Progress:Story={render:()=> <View style={{gap:24,width:280}}>{[0,6,15].map(value=><ProgressBar key={value} value={value} total={15}/>)}</View>};
function GoalRow(){const [selected,set]=useState(0);return <ScrollView horizontal style={{maxWidth:380}} contentContainerStyle={{gap:12,padding:4}}>{['책 읽기','산책','물 마시기','운동하기'].map((label,i)=><GoalChip key={label} label={label} value={i===0?6:3} total={15} selected={selected===i} onPress={()=>set(i)}/>)}<PixelButton label="+" accessibilityLabel="새 목표 만들기" variant="secondary"/></ScrollView>}
export const SwitchGoals:Story={render:()=> <GoalRow/>};
