import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';

// Crear mocks antes de importar
const mockAvailabilityService = {
  getVetAvailability: jest.fn(),
  isSlotAvailable: jest.fn(),
  findNextAvailableSlot: jest.fn(),
  getAvailabilityStatistics: jest.fn(),
};

const mockVetScheduleService = {
  getVetScheduleByDay: jest.fn(),
  getVetSchedules: jest.fn(),
  getVetSchedulesBySpeciality: jest.fn(),
  createSchedule: jest.fn(),
  updateSchedule: jest.fn(),
  deleteSchedule: jest.fn(),
};

const mockAppointmentBlockService = {
  getBlocksByDateRange: jest.fn(),
  getBlocksByDate: jest.fn(),
  isTimeSlotBlocked: jest.fn(),
  createBlock: jest.fn(),
  createRecurringBlock: jest.fn(),
  deleteBlock: jest.fn(),
};

// Mock de los servicios
jest.mock('@/services/availability-service', () => ({
  availabilityService: mockAvailabilityService
}));

jest.mock('@/services/vet-schedule-service', () => ({
  vetScheduleService: mockVetScheduleService
}));

jest.mock('@/services/appointment-block-service', () => ({
  appointmentBlockService: mockAppointmentBlockService
}));

// Importar después de los mocks
import {
  useCalendar,
  useVetSchedule,
  useAppointmentBlocks,
} from '@/hooks/use-calendar';

describe('useCalendar Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useCalendar', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useCalendar());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.currentAvailability).toBeNull();
      expect(result.current.weekAvailability).toEqual([]);
      expect(result.current.selectedVet).toBeNull();
      expect(result.current.selectedSpeciality).toBeNull();
      expect(result.current.selectedDate).toBe(
        new Date().toISOString().split('T')[0]
      );
    });

    it('should fetch vet availability successfully', async () => {
      const mockAvailability = {
        date: '2024-03-15',
        is_holiday: false,
        available_slots: [
          {
            date: '2024-03-15',
            start_time: '09:00',
            end_time: '10:00',
            is_available: true,
            vet_id: 1,
            speciality_id: 1,
            branch_id: 1,
            duration_minutes: 60,
          },
        ],
        blocked_slots: [],
        existing_appointments: [],
      };

      mockAvailabilityService.getVetAvailability.mockResolvedValue({
        data: mockAvailability,
        error: null,
        success: true,
      });

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        const data = await result.current.getVetAvailability(
          1,
          1,
          '2024-03-15'
        );
        expect(data).toEqual(mockAvailability);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.currentAvailability).toEqual(mockAvailability);
      expect(mockAvailabilityService.getVetAvailability).toHaveBeenCalledWith(
        1,
        1,
        '2024-03-15',
        30
      );
    });

    it('should handle errors when fetching availability', async () => {
      const errorMessage = 'Failed to fetch availability';

      mockAvailabilityService.getVetAvailability.mockResolvedValue({
        data: null,
        error: errorMessage,
        success: false,
      });

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        const data = await result.current.getVetAvailability(
          1,
          1,
          '2024-03-15'
        );
        expect(data).toBeNull();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.currentAvailability).toBeNull();
    });

    it('should check slot availability', async () => {
      mockAvailabilityService.isSlotAvailable.mockResolvedValue({
        data: true,
        error: null,
        success: true,
      });

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        const isAvailable = await result.current.checkSlotAvailability(
          1,
          1,
          '2024-03-15',
          '10:00',
          60
        );
        expect(isAvailable).toBe(true);
      });

      expect(mockAvailabilityService.isSlotAvailable).toHaveBeenCalledWith(
        1,
        1,
        '2024-03-15',
        '10:00',
        60
      );
    });

    it('should find next available slot', async () => {
      const mockSlot = {
        date: '2024-03-16',
        start_time: '09:00',
        end_time: '10:00',
        is_available: true,
        vet_id: 1,
        speciality_id: 1,
        branch_id: 1,
        duration_minutes: 60,
      };

      mockAvailabilityService.findNextAvailableSlot.mockResolvedValue({
        data: mockSlot,
        error: null,
        success: true,
      });

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        const slot = await result.current.findNextAvailableSlot(
          1,
          1,
          '2024-03-15',
          60
        );
        expect(slot).toEqual(mockSlot);
      });

      expect(
        mockAvailabilityService.findNextAvailableSlot
      ).toHaveBeenCalledWith(1, 1, '2024-03-15', 60, 30);
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useCalendar());

      // Set an error first
      act(() => {
        result.current.getVetAvailability(1, 1, '2024-03-15');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should reset calendar state', () => {
      const { result } = renderHook(() => useCalendar());

      act(() => {
        result.current.resetCalendar();
      });

      expect(result.current.currentAvailability).toBeNull();
      expect(result.current.weekAvailability).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  describe('useVetSchedule', () => {
    it('should create schedule successfully', async () => {
      const mockSchedule = {
        id: 1,
        vet_id: 1,
        speciality_id: 1,
        weekday: 1,
        start_time: '09:00',
        end_time: '17:00',
      };

      const scheduleData = {
        vet_id: 1,
        speciality_id: 1,
        weekday: 1,
        start_time: '09:00',
        end_time: '17:00',
      };

      mockVetScheduleService.createSchedule.mockResolvedValue({
        data: mockSchedule,
        error: null,
        success: true,
      });

      const { result } = renderHook(() => useVetSchedule());

      await act(async () => {
        const schedule = await result.current.createSchedule(scheduleData);
        expect(schedule).toEqual(mockSchedule);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockVetScheduleService.createSchedule).toHaveBeenCalledWith(
        scheduleData
      );
    });

    it('should handle errors when creating schedule', async () => {
      const errorMessage = 'Schedule conflict detected';
      const scheduleData = {
        vet_id: 1,
        speciality_id: 1,
        weekday: 1,
        start_time: '09:00',
        end_time: '17:00',
      };

      mockVetScheduleService.createSchedule.mockResolvedValue({
        data: null,
        error: errorMessage,
        success: false,
      });

      const { result } = renderHook(() => useVetSchedule());

      await act(async () => {
        const schedule = await result.current.createSchedule(scheduleData);
        expect(schedule).toBeNull();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should update schedule successfully', async () => {
      const mockUpdatedSchedule = {
        id: 1,
        vet_id: 1,
        speciality_id: 1,
        weekday: 1,
        start_time: '08:00',
        end_time: '16:00',
      };

      const updateData = {
        start_time: '08:00',
        end_time: '16:00',
      };

      mockVetScheduleService.updateSchedule.mockResolvedValue({
        data: mockUpdatedSchedule,
        error: null,
        success: true,
      });

      const { result } = renderHook(() => useVetSchedule());

      await act(async () => {
        const schedule = await result.current.updateSchedule(1, updateData);
        expect(schedule).toEqual(mockUpdatedSchedule);
      });

      expect(mockVetScheduleService.updateSchedule).toHaveBeenCalledWith(
        1,
        updateData
      );
    });

    it('should delete schedule successfully', async () => {
      mockVetScheduleService.deleteSchedule.mockResolvedValue({
        data: true,
        error: null,
        success: true,
      });

      const { result } = renderHook(() => useVetSchedule());

      await act(async () => {
        const deleted = await result.current.deleteSchedule(1);
        expect(deleted).toBe(true);
      });

      expect(mockVetScheduleService.deleteSchedule).toHaveBeenCalledWith(1);
    });

    it('should get vet schedules successfully', async () => {
      const mockSchedules = [
        {
          id: 1,
          vet_id: 1,
          speciality_id: 1,
          weekday: 1,
          start_time: '09:00',
          end_time: '17:00',
        },
      ];

      mockVetScheduleService.getVetSchedules.mockResolvedValue({
        data: mockSchedules,
        error: null,
        success: true,
      });

      const { result } = renderHook(() => useVetSchedule());

      await act(async () => {
        const schedules = await result.current.getVetSchedules(1);
        expect(schedules).toEqual(mockSchedules);
      });

      expect(mockVetScheduleService.getVetSchedules).toHaveBeenCalledWith(1);
    });
  });

  describe('useAppointmentBlocks', () => {
    it('should create block successfully', async () => {
      const mockBlock = {
        id: 1,
        vet_id: 1,
        date: '2024-03-15',
        start_time: '10:00',
        end_time: '11:00',
        reason: 'Personal appointment',
      };

      const blockData = {
        vet_id: 1,
        date: '2024-03-15',
        start_time: '10:00',
        end_time: '11:00',
        reason: 'Personal appointment',
      };

      mockAppointmentBlockService.createBlock.mockResolvedValue({
        data: mockBlock,
        error: null,
        success: true,
      });

      const { result } = renderHook(() => useAppointmentBlocks());

      await act(async () => {
        const block = await result.current.createBlock(blockData);
        expect(block).toEqual(mockBlock);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockAppointmentBlockService.createBlock).toHaveBeenCalledWith(
        blockData
      );
    });

    it('should create recurring block successfully', async () => {
      const mockBlocks = [
        {
          id: 1,
          vet_id: 1,
          date: '2024-03-15',
          start_time: '12:00',
          end_time: '13:00',
          reason: 'Lunch break',
        },
        {
          id: 2,
          vet_id: 1,
          date: '2024-03-16',
          start_time: '12:00',
          end_time: '13:00',
          reason: 'Lunch break',
        },
      ];

      mockAppointmentBlockService.createRecurringBlock.mockResolvedValue({
        data: mockBlocks,
        error: null,
        success: true,
      });

      const { result } = renderHook(() => useAppointmentBlocks());

      await act(async () => {
        const blocks = await result.current.createRecurringBlock(
          1,
          ['2024-03-15', '2024-03-16'],
          '12:00',
          '13:00',
          'Lunch break'
        );
        expect(blocks).toEqual(mockBlocks);
      });

      expect(
        mockAppointmentBlockService.createRecurringBlock
      ).toHaveBeenCalledWith(
        1,
        ['2024-03-15', '2024-03-16'],
        '12:00',
        '13:00',
        'Lunch break'
      );
    });

    it('should get vet blocks successfully', async () => {
      const mockBlocks = [
        {
          id: 1,
          vet_id: 1,
          date: '2024-03-15',
          start_time: '10:00',
          end_time: '11:00',
          reason: 'Personal appointment',
        },
      ];

      mockAppointmentBlockService.getBlocksByDateRange.mockResolvedValue({
        data: mockBlocks,
        error: null,
        success: true,
      });

      const { result } = renderHook(() => useAppointmentBlocks());

      await act(async () => {
        const blocks = await result.current.getVetBlocks(
          1,
          '2024-03-01',
          '2024-03-31'
        );
        expect(blocks).toEqual(mockBlocks);
      });

      expect(
        mockAppointmentBlockService.getBlocksByDateRange
      ).toHaveBeenCalledWith(1, '2024-03-01', '2024-03-31');
    });

    it('should handle errors when creating blocks', async () => {
      const errorMessage = 'Block conflict detected';
      const blockData = {
        vet_id: 1,
        date: '2024-03-15',
        start_time: '10:00',
        end_time: '11:00',
        reason: 'Personal appointment',
      };

      mockAppointmentBlockService.createBlock.mockResolvedValue({
        data: null,
        error: errorMessage,
        success: false,
      });

      const { result } = renderHook(() => useAppointmentBlocks());

      await act(async () => {
        const block = await result.current.createBlock(blockData);
        expect(block).toBeNull();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });
});
