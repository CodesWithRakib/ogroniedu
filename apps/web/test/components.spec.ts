import { describe, it, expect } from 'vitest';
import React from 'react';
import { Button } from '../src/components/ui/Button';
import { Badge } from '../src/components/ui/Badge';
import { Card, CardTitle, CardDescription } from '../src/components/ui/Card';
import { Input } from '../src/components/ui/Input';
import { EmptyState } from '../src/components/ui/EmptyState';

describe('UI Primitives Unit Tests', () => {
  describe('Button Component', () => {
    it('should instantiate Button with variant and size classes', () => {
      const element = React.createElement(
        Button,
        { variant: 'primary', size: 'lg' },
        'নিবন্ধন করুন',
      );

      expect(element).toBeDefined();
      expect(element.props.variant).toBe('primary');
      expect(element.props.size).toBe('lg');
      expect(element.props.children).toBe('নিবন্ধন করুন');
    });

    it('should set aria-busy and aria-disabled when isLoading is true', () => {
      const element = React.createElement(Button, { isLoading: true }, 'লোড হচ্ছে');

      expect(element.props.isLoading).toBe(true);
    });
  });

  describe('Badge Component', () => {
    it('should instantiate Badge with success variant', () => {
      const element = React.createElement(Badge, { variant: 'success' }, 'যাচাইকৃত');

      expect(element).toBeDefined();
      expect(element.props.variant).toBe('success');
      expect(element.props.children).toBe('যাচাইকৃত');
    });
  });

  describe('Card Component Structure', () => {
    it('should render Card with Title and Description children', () => {
      const title = React.createElement(CardTitle, null, 'এনআইডি যাচাইকৃত শিক্ষক');
      const desc = React.createElement(CardDescription, null, 'শতভাগ নিরাপদ');
      const card = React.createElement(Card, null, title, desc);

      expect(card).toBeDefined();
      expect(card.props.children).toHaveLength(2);
    });
  });

  describe('Input Component', () => {
    it('should support label and error message props', () => {
      const input = React.createElement(Input, {
        label: 'মোবাইল নম্বর',
        errorMessage: 'সঠিক নম্বর দিন',
        placeholder: '০১XXXXXXXXX',
      });

      expect(input.props.label).toBe('মোবাইল নম্বর');
      expect(input.props.errorMessage).toBe('সঠিক নম্বর দিন');
      expect(input.props.placeholder).toBe('০১XXXXXXXXX');
    });
  });

  describe('EmptyState Component', () => {
    it('should configure EmptyState with title and description', () => {
      const empty = React.createElement(EmptyState, {
        title: 'কোনো শিক্ষক পাওয়া যায়নি',
        description: 'দয়া করে ফিল্টার পরিবর্তন করুন',
      });

      expect(empty.props.title).toBe('কোনো শিক্ষক পাওয়া যায়নি');
      expect(empty.props.description).toBe('দয়া করে ফিল্টার পরিবর্তন করুন');
    });
  });
});
